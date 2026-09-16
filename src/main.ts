import "./style.css";
import { computeBraceDepths, highlightJava } from "./javaHighlight";
import { questions, TOPIC_META, type ExamTopic, type SilverQuestion } from "./questions";

/** 本試験（1Z0-815-JPN）の形式に合わせた設定 */
const EXAM = {
  /** 本試験の出題数 */
  questionCount: 80,
  /** 本試験の制限時間（分） */
  minutes: 180,
  /** 合格ライン */
  passingRate: 0.63,
};

type Screen = "start" | "quiz" | "result" | "list";
type Mode = "practice" | "exam";
/** 問題一覧画面（"list"）を何のために開いたか。空一覧時のメッセージや、一覧内での挙動を左右する */
type ListMode = "search" | "bookmarks";

interface AppState {
  screen: Screen;
  mode: Mode;
  /** 練習モードで選んでいる分野。"all" は全分野 */
  topic: ExamTopic | "all";
  quizQuestions: SilverQuestion[];
  currentIndex: number;
  /** 各問で選んだ選択肢のインデックス */
  selections: number[][];
  /** 練習モードで答え合わせ済みかどうか */
  checked: boolean[];
  /** 模擬試験の残り秒数 */
  remainingSec: number;
  timerId: number | null;
  /** ブックマークした問題の id */
  bookmarks: Set<number>;
  /** 検索欄に残す直前の入力（トップに戻ったときに保持する） */
  searchQuery: string;
  /** 問題一覧画面に表示している問題（検索結果 or ブックマーク） */
  listQuestions: SilverQuestion[];
  listMode: ListMode;
  /**
   * quiz 画面の「中断」で戻る先。検索結果やブックマークから開いた問題は
   * 一覧へ戻し、通常の練習/模擬試験はトップへ戻す。
   */
  quizReturnScreen: "start" | "list";
}

const state: AppState = {
  screen: "start",
  mode: "practice",
  topic: "all",
  quizQuestions: [],
  currentIndex: 0,
  selections: [],
  checked: [],
  remainingSec: 0,
  timerId: null,
  bookmarks: loadBookmarks(),
  searchQuery: "",
  listQuestions: [],
  listMode: "search",
  quizReturnScreen: "start",
};

const app = document.getElementById("app")!;

const TOPICS = Object.keys(TOPIC_META) as ExamTopic[];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** ブックマークした問題 id を保存するキー */
const BOOKMARK_KEY = "java-cert-quiz-bookmarks";

function loadBookmarks(): Set<number> {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? new Set(parsed.filter((v): v is number => typeof v === "number")) : new Set();
  } catch {
    return new Set();
  }
}

function saveBookmarks(bookmarks: Set<number>): void {
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify([...bookmarks]));
  } catch {
    // プライベートモードや容量超過は無視する（ブックマーク自体は続けられる）
  }
}

function toggleBookmark(id: number): void {
  if (state.bookmarks.has(id)) {
    state.bookmarks.delete(id);
  } else {
    state.bookmarks.add(id);
  }
  saveBookmarks(state.bookmarks);
}

/**
 * 問題文・解説・選択肢・コード・分野名を対象に部分一致で検索する。
 * 「equals」「instanceof」のような技術用語でも、日本語の説明文でも引っかかるようにするため、
 * 問題を構成するほぼすべてのテキストを対象にしている。
 */
function matchQuestion(question: SilverQuestion, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;

  const haystack = [
    question.question,
    question.explanation,
    TOPIC_META[question.topic].label,
    ...question.choices,
    ...(question.code ?? []),
  ]
    .join("\n")
    .toLowerCase();

  return haystack.includes(needle);
}

/** 論点ごとに「前回出題した亜種」を覚えておくキー */
const LAST_VARIANT_KEY = "java-cert-quiz-last-variants";

function loadLastVariants(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LAST_VARIANT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function saveLastVariants(map: Record<string, number>): void {
  try {
    localStorage.setItem(LAST_VARIANT_KEY, JSON.stringify(map));
  } catch {
    // プライベートモードや容量超過は無視する（出題自体は続けられる）
  }
}

/**
 * 同じ論点（variantOf）の亜種からは 1 問だけを選ぶ。
 * その際、前回出題した亜種は候補から外すため、続けて解いても同じ問題は出てこない。
 * 亜種を一巡したら、また全体から選び直す。
 */
function pickOnePerConcept(pool: SilverQuestion[]): SilverQuestion[] {
  const groups = new Map<string, SilverQuestion[]>();
  const picked: SilverQuestion[] = [];

  for (const question of pool) {
    if (!question.variantOf) {
      picked.push(question);
      continue;
    }
    const list = groups.get(question.variantOf) ?? [];
    list.push(question);
    groups.set(question.variantOf, list);
  }

  const lastVariants = loadLastVariants();

  for (const [key, variants] of groups) {
    const notLastTime = variants.filter((v) => v.id !== lastVariants[key]);
    const candidates = notLastTime.length > 0 ? notLastTime : variants;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)]!;
    lastVariants[key] = chosen.id;
    picked.push(chosen);
  }

  saveLastVariants(lastVariants);
  return picked;
}

/**
 * 同じ分野の問題が並ばないように配置する。
 * 残りが多い分野から順に、直前と違う分野を選んで詰めていく。
 * 単一分野の練習など、分散しようがない場合はそのまま並べる。
 */
function spreadByTopic(items: SilverQuestion[]): SilverQuestion[] {
  const buckets = new Map<ExamTopic, SilverQuestion[]>();
  for (const question of items) {
    const list = buckets.get(question.topic) ?? [];
    list.push(question);
    buckets.set(question.topic, list);
  }

  const result: SilverQuestion[] = [];
  let lastTopic: ExamTopic | null = null;

  while (result.length < items.length) {
    let chosen: ExamTopic | null = null;
    let mostRemaining = 0;

    // 直前と違う分野のうち、残りが最も多いものを選ぶ（偏りを最後まで残さない）
    for (const [topic, list] of buckets) {
      if (list.length === 0 || topic === lastTopic) continue;
      if (list.length > mostRemaining) {
        chosen = topic;
        mostRemaining = list.length;
      }
    }

    // 直前と同じ分野しか残っていない場合は、やむを得ずそれを続ける
    if (chosen === null) {
      for (const [topic, list] of buckets) {
        if (list.length > 0) {
          chosen = topic;
          break;
        }
      }
    }
    if (chosen === null) break;

    result.push(buckets.get(chosen)!.shift()!);
    lastTopic = chosen;
  }

  return result;
}

/**
 * 選択肢の並びをシャッフルし、正解のインデックスも追随させる。
 * 同じ問題を繰り返し解いたときに「正解の位置」で覚えてしまうのを防ぐ。
 */
function shuffleChoices(question: SilverQuestion): SilverQuestion {
  const order = shuffle(question.choices.map((_, i) => i));
  return {
    ...question,
    choices: order.map((i) => question.choices[i]!),
    correct: question.correct.map((c) => order.indexOf(c)).sort((a, b) => a - b),
  };
}

function questionsByTopic(topic: ExamTopic | "all"): SilverQuestion[] {
  return topic === "all" ? questions : questions.filter((q) => q.topic === topic);
}

/** 正解判定。複数選択は本試験と同様に完全一致のみ正解（部分点なし） */
function isCorrect(question: SilverQuestion, selected: number[]): boolean {
  if (selected.length !== question.correct.length) return false;
  const want = new Set(question.correct);
  return selected.every((i) => want.has(i));
}

function score(): number {
  return state.quizQuestions.reduce(
    (sum, q, i) => sum + (isCorrect(q, state.selections[i] ?? []) ? 1 : 0),
    0,
  );
}

function stopTimer(): void {
  if (state.timerId !== null) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function startTimer(): void {
  stopTimer();
  state.timerId = window.setInterval(() => {
    state.remainingSec -= 1;
    if (state.remainingSec <= 0) {
      state.remainingSec = 0;
      finishExam();
      return;
    }
    const el = document.getElementById("exam-timer");
    if (el) el.textContent = formatTime(state.remainingSec);
  }, 1000);
}

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ------------------------------------------------------------------ トップ画面

function renderStart(): void {
  const total = questions.length;

  const topicCards = TOPICS.map((topic, index) => {
    const meta = TOPIC_META[topic];
    const count = questionsByTopic(topic).length;
    const selected = state.topic === topic;
    const num = String(index + 1).padStart(2, "0");
    return `
      <button
        type="button"
        class="difficulty-card ${selected ? "selected" : ""}"
        data-topic="${topic}"
        aria-pressed="${selected}"
        ${count === 0 ? "disabled" : ""}
      >
        <span class="difficulty-index">(${num})</span>
        <span class="difficulty-main">
          <span class="difficulty-label">${escapeHtml(meta.label)}</span>
          <span class="difficulty-desc">${escapeHtml(meta.description)}</span>
        </span>
        <span class="difficulty-count">${count} Q</span>
      </button>
    `;
  }).join("");

  const allSelected = state.topic === "all";

  app.innerHTML = `
    <main class="container">
      <header class="hero">
        <h1 class="hero-title">Java<br />Silver SE 11<br />対策クイズ</h1>
        <p class="lead">
          Oracle Certified Java Programmer, Silver SE 11（1Z0-815-JPN）の出題範囲に沿った練習問題です。
          コードを伴う問題はすべて JDK 11 で実際にコンパイル・実行し、正解を検証しています。
        </p>
      </header>

      <section class="card difficulty-section">
        <p class="section-label">(Mode)</p>
        <h2>出題範囲を選択</h2>
        <div class="difficulty-grid" role="group" aria-label="出題範囲">
          <button
            type="button"
            class="difficulty-card ${allSelected ? "selected" : ""}"
            data-topic="all"
            aria-pressed="${allSelected}"
          >
            <span class="difficulty-index">(00)</span>
            <span class="difficulty-main">
              <span class="difficulty-label">全分野</span>
              <span class="difficulty-desc">出題範囲全体からランダムに出題</span>
            </span>
            <span class="difficulty-count">${total} Q</span>
          </button>
          ${topicCards}
        </div>
      </section>

      <section class="card search-section">
        <p class="section-label">(Search)</p>
        <h2>問題を検索</h2>
        <form id="search-form" class="search-form">
          <input
            type="search"
            id="search-input"
            class="search-input"
            placeholder="キーワードを入力（例: instanceof, equals, 例外）"
            value="${escapeHtml(state.searchQuery)}"
          />
          <button type="submit" class="btn btn-ghost">検索</button>
        </form>
        <button type="button" class="btn-link bookmarks-link" id="bookmarks-btn">
          ブックマーク一覧を見る（${state.bookmarks.size} 件）
        </button>
      </section>

      <section class="card info-card">
        <p class="section-label">(Exam format)</p>
        <h2>本試験の形式</h2>
        <ol>
          <li data-index="01">出題数 ${EXAM.questionCount} 問 / 制限時間 ${EXAM.minutes} 分</li>
          <li data-index="02">合格ライン ${Math.round(EXAM.passingRate * 100)}%</li>
          <li data-index="03">複数選択問題は「2つ選びなさい」のように選ぶ数が示されます</li>
          <li data-index="04">複数選択は部分点なし。すべて正しく選んで初めて正解です</li>
        </ol>
      </section>

      <div class="start-actions">
        <button class="btn btn-primary btn-large" id="practice-btn">練習モードで始める</button>
        <button class="btn btn-ghost" id="exam-btn">模擬試験モード（${EXAM.minutes}分）</button>
      </div>
    </main>
  `;

  document.querySelectorAll("[data-topic]").forEach((el) => {
    el.addEventListener("click", () => {
      state.topic = el.getAttribute("data-topic") as ExamTopic | "all";
      renderStart();
    });
  });

  document.getElementById("practice-btn")!.addEventListener("click", () => startQuiz("practice"));
  document.getElementById("exam-btn")!.addEventListener("click", () => startQuiz("exam"));

  document.getElementById("search-form")!.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("search-input") as HTMLInputElement;
    const query = input.value.trim();
    if (!query) return;
    state.searchQuery = query;
    openList(
      questions.filter((q) => matchQuestion(q, query)),
      "search",
    );
  });

  document.getElementById("bookmarks-btn")!.addEventListener("click", () => {
    openList(
      questions.filter((q) => state.bookmarks.has(q.id)),
      "bookmarks",
    );
  });
}

function openList(results: SilverQuestion[], mode: ListMode): void {
  state.listQuestions = results;
  state.listMode = mode;
  state.screen = "list";
  render();
}

// -------------------------------------------------------------------- 一覧画面

function renderList(): void {
  const items = state.listQuestions;

  const title = state.listMode === "search" ? `「${state.searchQuery}」の検索結果` : "ブックマーク";
  const emptyMessage =
    state.listMode === "search"
      ? "該当する問題が見つかりませんでした。別のキーワードを試してください。"
      : "まだブックマークした問題がありません。問題を解いているときに ☆ を押すとここに追加されます。";

  const itemsHtml = items
    .map((question, index) => {
      const bookmarked = state.bookmarks.has(question.id);
      return `
        <div class="list-item">
          <span class="list-item-no">${escapeHtml(TOPIC_META[question.topic].label)}</span>
          <button type="button" class="list-item-open" data-open-index="${index}">
            <span class="list-item-title">${escapeHtml(question.question.slice(0, 60))}</span>
          </button>
          <button
            type="button"
            class="bookmark-toggle ${bookmarked ? "active" : ""}"
            data-bookmark-id="${question.id}"
            aria-pressed="${bookmarked}"
            aria-label="${bookmarked ? "ブックマークを解除" : "ブックマークに追加"}"
          >${bookmarked ? "★" : "☆"}</button>
        </div>
      `;
    })
    .join("");

  app.innerHTML = `
    <main class="container">
      <header class="quiz-header">
        <div class="quiz-meta">
          <span>${escapeHtml(title)}（${items.length} 件）</span>
          <span class="quiz-meta-actions">
            <button class="btn-link" id="list-back-btn" type="button">トップへ</button>
          </span>
        </div>
      </header>

      <section class="card list-section">
        ${items.length === 0 ? `<p class="list-empty">${escapeHtml(emptyMessage)}</p>` : `<div class="list-items">${itemsHtml}</div>`}
      </section>
    </main>
  `;

  document.getElementById("list-back-btn")!.addEventListener("click", () => {
    state.screen = "start";
    render();
  });

  document.querySelectorAll("[data-open-index]").forEach((el) => {
    el.addEventListener("click", () => {
      const index = Number(el.getAttribute("data-open-index"));
      openQuestionFromList(index);
    });
  });

  document.querySelectorAll("[data-bookmark-id]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = Number(el.getAttribute("data-bookmark-id"));
      toggleBookmark(id);
      // ブックマーク一覧は解除したその場で消す。検索結果はブックマーク状態と無関係なので残す
      if (state.listMode === "bookmarks") {
        state.listQuestions = state.listQuestions.filter((q) => q.id !== id);
      }
      renderList();
    });
  });
}

/** 一覧画面から問題を開く。一覧内の他の問題へも「次へ」で順送りできるようにする */
function openQuestionFromList(index: number): void {
  const picked = state.listQuestions.map(shuffleChoices);

  state.mode = "practice";
  state.quizQuestions = picked;
  state.currentIndex = index;
  state.selections = picked.map(() => []);
  state.checked = picked.map(() => false);
  state.quizReturnScreen = "list";
  state.remainingSec = 0;
  stopTimer();
  state.screen = "quiz";
  render();
}

// -------------------------------------------------------------------- 出題画面

function renderCode(question: SilverQuestion): string {
  if (!question.code) return "";

  const depths = computeBraceDepths(question.code);
  const lines = question.code
    .map((line, index) => {
      const lineNo = index + 1;
      return `
        <div class="code-line" data-line="${lineNo}">
          <span class="line-no">${lineNo}</span>
          <code class="line-code">${highlightJava(line, lineNo, null, null, depths[index]) || "&nbsp;"}</code>
        </div>
      `;
    })
    .join("");

  return `
    <div class="code-block" role="group" aria-label="Java コード">
      <div class="code-toolbar">
        <span class="filename">${question.className ? `${escapeHtml(question.className)}.java` : "module-info.java"}</span>
      </div>
      <div class="code-scroll">
        <div class="code-lines">${lines}</div>
      </div>
    </div>
  `;
}

function renderQuiz(): void {
  const question = state.quizQuestions[state.currentIndex]!;
  const total = state.quizQuestions.length;
  const selected = state.selections[state.currentIndex] ?? [];
  const isChecked = state.checked[state.currentIndex] === true;
  const multiple = question.correct.length > 1;
  const correct = isCorrect(question, selected);

  const answeredCount = state.selections.filter((s) => s.length > 0).length;
  const progress = total === 0 ? 0 : (answeredCount / total) * 100;

  const choicesHtml = question.choices
    .map((choice, index) => {
      const picked = selected.includes(index);
      const isAnswer = question.correct.includes(index);
      const classes = ["choice-item"];
      if (picked) classes.push("picked");
      if (isChecked && isAnswer) classes.push("answer");
      if (isChecked && picked && !isAnswer) classes.push("wrong");

      const marker = String.fromCharCode(65 + index); // A, B, C...
      return `
        <button
          type="button"
          class="${classes.join(" ")}"
          data-choice="${index}"
          role="${multiple ? "checkbox" : "radio"}"
          aria-checked="${picked}"
          ${isChecked ? "disabled" : ""}
        >
          <span class="choice-marker">${marker}</span>
          <span class="choice-text">${escapeHtml(choice)}</span>
        </button>
      `;
    })
    .join("");

  const feedbackHtml = isChecked
    ? `
      <div class="feedback ${correct ? "feedback-correct" : "feedback-wrong"}">
        <div class="feedback-header">
          <span class="feedback-icon">${correct ? "✓" : "✗"}</span>
          <strong>${correct ? "正解" : "不正解"}</strong>
        </div>
        <p class="pattern-name">正解: ${question.correct.map((i) => String.fromCharCode(65 + i)).join(", ")}</p>
        <p>${escapeHtml(question.explanation)}</p>
      </div>
    `
    : "";

  // タイマーは計測中だけ出す。採点後の見直しでは止まった時刻が残り時間に見えてしまう
  const timerHtml =
    state.mode === "exam" && state.timerId !== null
      ? `<span id="exam-timer" class="exam-timer">${formatTime(state.remainingSec)}</span>`
      : `<span>${escapeHtml(TOPIC_META[question.topic].label)}</span>`;

  const isLast = state.currentIndex === total - 1;
  const isListSession = state.quizReturnScreen === "list";
  const bookmarked = state.bookmarks.has(question.id);

  app.innerHTML = `
    <main class="container">
      <header class="quiz-header">
        <div class="quiz-meta">
          <span>Q ${state.currentIndex + 1} / ${total}</span>
          <span class="quiz-meta-actions">
            <button class="btn-link" id="quit-btn" type="button">${isListSession ? "一覧へ" : "中断"}</button>
            ${timerHtml}
          </span>
        </div>
        <div class="progress-bar" aria-hidden="true">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
      </header>

      <section class="card question-card">
        <div class="question-card-head">
          <p class="selection-guide">${multiple ? `${question.correct.length}つ選びなさい。` : "1つ選びなさい。"}</p>
          <button
            type="button"
            class="bookmark-toggle ${bookmarked ? "active" : ""}"
            id="bookmark-btn"
            aria-pressed="${bookmarked}"
            aria-label="${bookmarked ? "ブックマークを解除" : "ブックマークに追加"}"
          >${bookmarked ? "★" : "☆"}</button>
        </div>
        <p class="question-desc">${escapeHtml(question.question)}</p>

        ${renderCode(question)}

        <div class="choice-list" role="${multiple ? "group" : "radiogroup"}" aria-label="選択肢">
          ${choicesHtml}
        </div>

        ${feedbackHtml}

        <div class="actions">
          ${state.currentIndex > 0 ? `<button class="btn btn-ghost" id="prev-btn">前へ</button>` : ""}
          ${
            state.mode === "practice" && !isChecked
              ? `<button class="btn btn-primary" id="check-btn" ${selected.length === 0 ? "disabled" : ""}>解答する</button>`
              : isLast
                ? `<button class="btn btn-primary" id="finish-btn">${isListSession ? "一覧に戻る" : state.mode === "exam" ? "採点する" : "結果を見る"}</button>`
                : `<button class="btn btn-primary" id="next-btn">次の問題へ</button>`
          }
        </div>
      </section>
    </main>
  `;

  document.querySelectorAll("[data-choice]").forEach((el) => {
    el.addEventListener("click", () => {
      const index = Number(el.getAttribute("data-choice"));
      toggleChoice(index, multiple);
    });
  });

  document.getElementById("quit-btn")!.addEventListener("click", () => {
    stopTimer();
    state.screen = state.quizReturnScreen;
    render();
  });
  document.getElementById("bookmark-btn")?.addEventListener("click", () => {
    toggleBookmark(question.id);
    renderQuiz();
  });
  document.getElementById("prev-btn")?.addEventListener("click", () => {
    state.currentIndex -= 1;
    render();
  });
  document.getElementById("check-btn")?.addEventListener("click", () => {
    state.checked[state.currentIndex] = true;
    render();
  });
  document.getElementById("next-btn")?.addEventListener("click", () => {
    state.currentIndex += 1;
    render();
  });
  document.getElementById("finish-btn")?.addEventListener("click", () => {
    if (isListSession) {
      stopTimer();
      state.screen = "list";
      render();
    } else {
      finishExam();
    }
  });
}

function toggleChoice(index: number, multiple: boolean): void {
  if (state.checked[state.currentIndex]) return;

  const current = state.selections[state.currentIndex] ?? [];
  if (multiple) {
    state.selections[state.currentIndex] = current.includes(index)
      ? current.filter((i) => i !== index)
      : [...current, index].sort((a, b) => a - b);
  } else {
    state.selections[state.currentIndex] = current.includes(index) ? [] : [index];
  }
  render();
}

// -------------------------------------------------------------------- 結果画面

function finishExam(): void {
  stopTimer();
  state.screen = "result";
  render();
}

function renderResult(): void {
  const total = state.quizQuestions.length;
  const correctCount = score();
  const rate = total === 0 ? 0 : correctCount / total;
  const percentage = Math.round(rate * 100);
  const passed = rate >= EXAM.passingRate;

  // 分野別の正答状況
  const byTopic = new Map<ExamTopic, { correct: number; total: number }>();
  state.quizQuestions.forEach((q, i) => {
    const entry = byTopic.get(q.topic) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (isCorrect(q, state.selections[i] ?? [])) entry.correct += 1;
    byTopic.set(q.topic, entry);
  });

  const topicRows = [...byTopic.entries()]
    .map(
      ([topic, r]) => `
        <div class="topic-row">
          <span class="topic-row-label">${escapeHtml(TOPIC_META[topic].label)}</span>
          <span class="topic-row-score ${r.correct === r.total ? "full" : ""}">${r.correct} / ${r.total}</span>
        </div>
      `,
    )
    .join("");

  const reviewItems = state.quizQuestions
    .map((q, i) => {
      const ok = isCorrect(q, state.selections[i] ?? []);
      return `
        <button type="button" class="question-list-item" data-review="${i}">
          <span class="question-list-no">${String(i + 1).padStart(2, "0")}</span>
          <span class="question-list-main">
            <span class="question-list-title">${escapeHtml(TOPIC_META[q.topic].label)}</span>
            <span class="question-list-pattern">${escapeHtml(q.question.slice(0, 40))}…</span>
          </span>
          <span class="question-list-status ${ok ? "correct" : "wrong"}">${ok ? "正解" : "不正解"}</span>
        </button>
      `;
    })
    .join("");

  app.innerHTML = `
    <main class="container">
      <section class="card result-card">
        <p class="section-label">(Result)</p>
        <h1>${state.mode === "exam" ? "模擬試験の結果" : "結果"}</h1>
        <p class="score-display">${correctCount} <span>/ ${total}</span></p>
        <p class="score-percent">${percentage}%</p>
        ${
          state.mode === "exam"
            ? `<p class="result-message ${passed ? "passed" : "failed"}">
                 ${passed ? "合格ラインに到達しています" : `不合格（合格ラインは ${Math.round(EXAM.passingRate * 100)}%）`}
               </p>`
            : ""
        }

        <div class="topic-breakdown">
          <p class="section-label">(By topic)</p>
          ${topicRows}
        </div>

        <div class="result-actions">
          <button class="btn btn-primary btn-large" id="retry-btn">もう一度</button>
          <button class="btn btn-ghost" id="home-btn">トップへ</button>
        </div>
      </section>

      <section class="card question-list-section" aria-label="解答の確認">
        <p class="section-label">(Review)</p>
        <div class="question-list">${reviewItems}</div>
      </section>
    </main>
  `;

  document.getElementById("retry-btn")!.addEventListener("click", () => startQuiz(state.mode));
  document.getElementById("home-btn")!.addEventListener("click", () => {
    state.screen = "start";
    render();
  });
  document.querySelectorAll("[data-review]").forEach((el) => {
    el.addEventListener("click", () => {
      state.currentIndex = Number(el.getAttribute("data-review"));
      state.checked[state.currentIndex] = true;
      state.screen = "quiz";
      render();
    });
  });
}

// ------------------------------------------------------------------------ 起動

function startQuiz(mode: Mode): void {
  const pool = mode === "exam" ? questions : questionsByTopic(state.topic);
  // 論点ごとに亜種を1問だけ選び、シャッフルしてから同じ分野が並ばないように配置する
  const perConcept = pickOnePerConcept(pool);
  const limited = shuffle(perConcept).slice(
    0,
    mode === "exam" ? EXAM.questionCount : perConcept.length,
  );
  const picked = spreadByTopic(limited).map(shuffleChoices);

  state.mode = mode;
  state.quizQuestions = picked;
  state.currentIndex = 0;
  state.selections = picked.map(() => []);
  state.checked = picked.map(() => false);
  state.screen = "quiz";
  state.quizReturnScreen = "start";

  if (mode === "exam") {
    // 問題数が本試験より少ない場合は、1問あたりの持ち時間に合わせて短縮する
    const perQuestionSec = (EXAM.minutes * 60) / EXAM.questionCount;
    state.remainingSec = Math.round(perQuestionSec * picked.length);
    startTimer();
  } else {
    state.remainingSec = 0;
    stopTimer();
  }

  render();
}

function render(): void {
  switch (state.screen) {
    case "start":
      renderStart();
      break;
    case "quiz":
      renderQuiz();
      break;
    case "result":
      renderResult();
      break;
    case "list":
      renderList();
      break;
  }
}

render();
