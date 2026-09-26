import "./style.css";
import { computeBraceDepths, highlightJavaLine, textBlockRanges } from "./javaHighlight";
import {
  EXAM_IDS,
  EXAMS,
  questions,
  topicMeta,
  type ExamId,
  type ExamTopic,
  type Question,
} from "./questions";

type Screen = "start" | "quiz" | "result" | "list";
type Mode = "practice" | "exam";
/** 問題一覧画面（"list"）を何のために開いたか。空一覧時のメッセージや、一覧内での挙動を左右する */
type ListMode = "search" | "bookmarks" | "mistakes";

interface AppState {
  screen: Screen;
  mode: Mode;
  /** 選んでいる試験区分。分野・検索・ブックマーク一覧などはこの試験区分の問題だけを対象にする */
  exam: ExamId;
  /** 練習モードで選んでいる分野。"all" は全分野 */
  topic: ExamTopic | "all";
  quizQuestions: Question[];
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
  /** 間違えた問題の id（復習用・localStorage と同期） */
  wrongAnswers: Set<number>;
  /** 検索欄に残す直前の入力（トップに戻ったときに保持する） */
  searchQuery: string;
  /** 問題一覧画面に表示している問題（検索結果 or ブックマーク） */
  listQuestions: Question[];
  listMode: ListMode;
  /**
   * quiz 画面の「中断」で戻る先。検索結果やブックマークから開いた問題は
   * 一覧へ戻し、通常の練習/模擬試験はトップへ戻す。
   */
  quizReturnScreen: "start" | "list";
}

// localStorage のキー。下の state の初期化で読み込むため、state より前に宣言しておく
// （後ろに置くと初期化前の const を参照して ReferenceError になり、読み込みが常に失敗する）
/** 選んだ試験区分を保存するキー */
const EXAM_KEY = "java-cert-quiz-exam";
/** ブックマークした問題 id を保存するキー */
const BOOKMARK_KEY = "java-cert-quiz-bookmarks";
/** 間違えた問題 id を保存するキー */
const WRONG_ANSWERS_KEY = "java-cert-quiz-wrong-answers";

const state: AppState = {
  screen: "start",
  mode: "practice",
  exam: loadExam(),
  topic: "all",
  quizQuestions: [],
  currentIndex: 0,
  selections: [],
  checked: [],
  remainingSec: 0,
  timerId: null,
  bookmarks: loadBookmarks(),
  wrongAnswers: loadWrongAnswers(),
  searchQuery: "",
  listQuestions: [],
  listMode: "search",
  quizReturnScreen: "start",
};

const app = document.getElementById("app")!;

/** 選んでいる試験区分の設定（出題数・制限時間・合格ライン・分野） */
function currentExam() {
  return EXAMS[state.exam];
}

/** 選んでいる試験区分の分野（表示順） */
function currentTopics(): ExamTopic[] {
  return Object.keys(currentExam().topics) as ExamTopic[];
}

/** 選んでいる試験区分の問題 */
function examQuestions(): Question[] {
  return questions.filter((q) => q.exam === state.exam);
}

function topicLabel(question: Question): string {
  return topicMeta(question.exam, question.topic).label;
}

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

function loadExam(): ExamId {
  try {
    const raw = localStorage.getItem(EXAM_KEY);
    return EXAM_IDS.includes(raw as ExamId) ? (raw as ExamId) : "silver11";
  } catch {
    return "silver11";
  }
}

function saveExam(exam: ExamId): void {
  try {
    localStorage.setItem(EXAM_KEY, exam);
  } catch {
    // プライベートモードや容量超過は無視する（試験区分の選択自体は続けられる）
  }
}

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

function loadWrongAnswers(): Set<number> {
  try {
    const raw = localStorage.getItem(WRONG_ANSWERS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? new Set(parsed.filter((v): v is number => typeof v === "number")) : new Set();
  } catch {
    return new Set();
  }
}

function saveWrongAnswers(wrongAnswers: Set<number>): void {
  try {
    localStorage.setItem(WRONG_ANSWERS_KEY, JSON.stringify([...wrongAnswers]));
  } catch {
    // プライベートモードや容量超過は無視する
  }
}

/** 不正解だった問題を復習リストに追加する（既にあればそのまま） */
function recordWrongAnswer(id: number): void {
  if (state.wrongAnswers.has(id)) return;
  state.wrongAnswers.add(id);
  saveWrongAnswers(state.wrongAnswers);
}

function removeWrongAnswer(id: number): void {
  if (!state.wrongAnswers.has(id)) return;
  state.wrongAnswers.delete(id);
  saveWrongAnswers(state.wrongAnswers);
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
function matchQuestion(question: Question, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;

  const haystack = [
    question.question,
    question.explanation,
    topicLabel(question),
    ...question.choices,
    ...(question.code ?? []),
    ...(question.resources ?? []).flatMap((r) => r.content),
    ...(question.moduleSetup?.sources ?? []).flatMap((s) => s.content),
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
function pickOnePerConcept(pool: Question[]): Question[] {
  const groups = new Map<string, Question[]>();
  const picked: Question[] = [];

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
function spreadByTopic(items: Question[]): Question[] {
  const buckets = new Map<ExamTopic, Question[]>();
  for (const question of items) {
    const list = buckets.get(question.topic) ?? [];
    list.push(question);
    buckets.set(question.topic, list);
  }

  const result: Question[] = [];
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
function shuffleChoices(question: Question): Question {
  const order = shuffle(question.choices.map((_, i) => i));
  return {
    ...question,
    choices: order.map((i) => question.choices[i]!),
    correct: question.correct.map((c) => order.indexOf(c)).sort((a, b) => a - b),
  };
}

function questionsByTopic(topic: ExamTopic | "all"): Question[] {
  const pool = examQuestions();
  return topic === "all" ? pool : pool.filter((q) => q.topic === topic);
}

/** 正解判定。複数選択は本試験と同様に完全一致のみ正解（部分点なし） */
function isCorrect(question: Question, selected: number[]): boolean {
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

/**
 * 新しい画面・新しい問題を表示する直前に呼ぶ。
 * innerHTML の書き換えではスクロール位置が保たれてしまうため、
 * 「前の問題を読み終えた位置のまま次の問題が表示される」という不便を防ぐ。
 * 選択肢クリックや解答表示など、同じ問題内での再描画では呼ばない
 * （呼ぶと選択のたびに画面が先頭に飛んで、逆に使いにくくなる）。
 */
function scrollToTop(): void {
  window.scrollTo(0, 0);
}

// ------------------------------------------------------------------ トップ画面

function renderStart(): void {
  const exam = currentExam();
  const total = examQuestions().length;

  const examCards = EXAM_IDS.map((id) => {
    const meta = EXAMS[id];
    const count = questions.filter((q) => q.exam === id).length;
    const selected = state.exam === id;
    return `
      <button
        type="button"
        class="exam-card ${selected ? "selected" : ""}"
        data-exam="${id}"
        aria-pressed="${selected}"
      >
        <span class="exam-card-name">${escapeHtml(meta.name)}</span>
        <span class="exam-card-code">${escapeHtml(meta.code)} / JDK ${meta.jdk}</span>
        <span class="exam-card-count">${count} Q</span>
      </button>
    `;
  }).join("");

  const topicCards = currentTopics().map((topic, index) => {
    const meta = topicMeta(state.exam, topic);
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
  const selectedTopicLabel =
    state.topic === "all" ? "全分野" : topicMeta(state.exam, state.topic).label;

  app.innerHTML = `
    <main class="container start-page">
      <header class="hero">
        <h1 class="hero-title">Java<br />${escapeHtml(exam.name)}<br />対策クイズ</h1>
        <p class="lead">
          Oracle Certified Java Programmer, ${escapeHtml(exam.name)}（${escapeHtml(exam.code)}）の出題範囲に沿った練習問題です。
          コードを伴う問題はすべて JDK ${exam.jdk} で実際にコンパイル・実行し、正解を検証しています。
        </p>
      </header>

      <section class="card exam-section">
        <p class="section-label">(Exam)</p>
        <h2>試験区分を選択</h2>
        <div class="exam-grid" role="group" aria-label="試験区分">
          ${examCards}
        </div>
      </section>

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

      <div class="start-actions-dock" aria-label="クイズを開始">
        <div class="start-actions-dock-inner">
          <p class="start-actions-topic">
            選択中: <strong>${escapeHtml(selectedTopicLabel)}</strong>
          </p>
          <div class="start-actions">
            <button class="btn btn-primary btn-large" id="practice-btn" type="button">練習モードで始める</button>
            <button class="btn btn-ghost" id="exam-btn" type="button">模擬試験モード（${exam.minutes}分）</button>
          </div>
        </div>
      </div>

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
          ブックマーク一覧を見る（${examQuestions().filter((q) => state.bookmarks.has(q.id)).length} 件）
        </button>
        <button type="button" class="btn-link bookmarks-link" id="mistakes-btn">
          間違えた問題を見る（${examQuestions().filter((q) => state.wrongAnswers.has(q.id)).length} 件）
        </button>
      </section>

      <section class="card info-card">
        <p class="section-label">(Exam format)</p>
        <h2>本試験の形式（${escapeHtml(exam.code)}）</h2>
        <ol>
          <li data-index="01">出題数 ${exam.questionCount} 問 / 制限時間 ${exam.minutes} 分</li>
          <li data-index="02">合格ライン ${Math.round(exam.passingRate * 100)}%</li>
          <li data-index="03">複数選択問題は「2つ選びなさい」のように選ぶ数が示されます</li>
          <li data-index="04">複数選択は部分点なし。すべて正しく選んで初めて正解です</li>
        </ol>
      </section>
    </main>
  `;

  document.querySelectorAll("[data-exam]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-exam") as ExamId;
      if (id === state.exam) return;
      state.exam = id;
      // 分野は試験区分ごとに別物なので、切り替えたら全分野に戻す
      state.topic = "all";
      saveExam(id);
      renderStart();
    });
  });

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
      examQuestions().filter((q) => matchQuestion(q, query)),
      "search",
    );
  });

  document.getElementById("bookmarks-btn")!.addEventListener("click", () => {
    openList(
      examQuestions().filter((q) => state.bookmarks.has(q.id)),
      "bookmarks",
    );
  });

  document.getElementById("mistakes-btn")!.addEventListener("click", () => {
    openList(
      examQuestions().filter((q) => state.wrongAnswers.has(q.id)),
      "mistakes",
    );
  });
}

function openList(results: Question[], mode: ListMode): void {
  state.listQuestions = results;
  state.listMode = mode;
  state.screen = "list";
  scrollToTop();
  render();
}

// -------------------------------------------------------------------- 一覧画面

function renderList(): void {
  const items = state.listQuestions;

  const title =
    state.listMode === "search"
      ? `「${state.searchQuery}」の検索結果`
      : state.listMode === "bookmarks"
        ? "ブックマーク"
        : "間違えた問題";
  const emptyMessage =
    state.listMode === "search"
      ? "該当する問題が見つかりませんでした。別のキーワードを試してください。"
      : state.listMode === "bookmarks"
        ? "まだブックマークした問題がありません。問題を解いているときに ☆ を押すとここに追加されます。"
        : "まだ記録がありません。練習で不正解にした問題、模擬試験で不正解だった問題がここに自動で追加されます。";

  const itemsHtml = items
    .map((question, index) => {
      const bookmarked = state.bookmarks.has(question.id);
      const actionHtml =
        state.listMode === "mistakes"
          ? `
          <button
            type="button"
            class="list-remove-btn"
            data-remove-wrong-id="${question.id}"
            aria-label="一覧から削除"
          >×</button>
        `
          : `
          <button
            type="button"
            class="bookmark-toggle ${bookmarked ? "active" : ""}"
            data-bookmark-id="${question.id}"
            aria-pressed="${bookmarked}"
            aria-label="${bookmarked ? "ブックマークを解除" : "ブックマークに追加"}"
          >${bookmarked ? "★" : "☆"}</button>
        `;
      return `
        <div class="list-item">
          <span class="list-item-no">${escapeHtml(topicLabel(question))}</span>
          <button type="button" class="list-item-open" data-open-index="${index}">
            <span class="list-item-title">${escapeHtml(question.question.slice(0, 60))}</span>
          </button>
          ${actionHtml}
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
    scrollToTop();
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

  document.querySelectorAll("[data-remove-wrong-id]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = Number(el.getAttribute("data-remove-wrong-id"));
      removeWrongAnswer(id);
      state.listQuestions = state.listQuestions.filter((q) => q.id !== id);
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
  scrollToTop();
  render();
}

// -------------------------------------------------------------------- 出題画面

/** 1 ファイル分のコードブロック。Java 以外（プロパティファイルや入力ファイル）はハイライトしない */
function renderCodeBlock(fileName: string, content: string[]): string {
  const isJava = fileName.endsWith(".java");
  const depths = computeBraceDepths(content);
  const textBlocks = textBlockRanges(content);
  const lines = content
    .map((line, index) => {
      const lineNo = index + 1;
      const html = isJava ? highlightJavaLine(line, lineNo, depths[index] ?? 1, textBlocks[index] ?? null) : escapeHtml(line);
      return `
        <div class="code-line" data-line="${lineNo}">
          <span class="line-no">${lineNo}</span>
          <code class="line-code">${html || "&nbsp;"}</code>
        </div>
      `;
    })
    .join("");

  return `
    <div class="code-block" role="group" aria-label="${escapeHtml(fileName)}">
      <div class="code-toolbar">
        <span class="filename">${escapeHtml(fileName)}</span>
      </div>
      <div class="code-scroll">
        <div class="code-lines">${lines}</div>
      </div>
    </div>
  `;
}

/**
 * 問題が提示するファイル一式を表示する。
 * code が無いモジュール構成の問題では、検証に使うソース一式をそのまま見せる
 * （表示しているコードと実機で検証したコードを一致させるため）。
 */
function renderCode(question: Question): string {
  const blocks: string[] = [];

  if (question.code) {
    const fileName = question.className ? `${question.className}.java` : "module-info.java";
    blocks.push(renderCodeBlock(fileName, question.code));
  } else if (question.moduleSetup) {
    for (const jar of question.moduleSetup.jars ?? []) {
      for (const file of jar.sources) {
        blocks.push(renderCodeBlock(`${jar.fileName} : ${file.path}`, file.content));
      }
    }
    for (const file of question.moduleSetup.sources) {
      blocks.push(renderCodeBlock(`${file.module}/${file.path}`, file.content));
    }
  }

  for (const resource of question.resources ?? []) {
    blocks.push(renderCodeBlock(resource.path, resource.content));
  }

  return blocks.join("");
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
      : `<span>${escapeHtml(topicLabel(question))}</span>`;

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
    scrollToTop();
    render();
  });
  document.getElementById("bookmark-btn")?.addEventListener("click", () => {
    toggleBookmark(question.id);
    renderQuiz();
  });
  document.getElementById("prev-btn")?.addEventListener("click", () => {
    state.currentIndex -= 1;
    scrollToTop();
    render();
  });
  document.getElementById("check-btn")?.addEventListener("click", () => {
    state.checked[state.currentIndex] = true;
    if (!isCorrect(question, selected)) {
      recordWrongAnswer(question.id);
    }
    render();
  });
  document.getElementById("next-btn")?.addEventListener("click", () => {
    state.currentIndex += 1;
    scrollToTop();
    render();
  });
  document.getElementById("finish-btn")?.addEventListener("click", () => {
    if (isListSession) {
      stopTimer();
      state.screen = "list";
      scrollToTop();
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
  if (state.mode === "exam") {
    state.quizQuestions.forEach((q, i) => {
      if (!isCorrect(q, state.selections[i] ?? [])) {
        recordWrongAnswer(q.id);
      }
    });
  }
  state.screen = "result";
  scrollToTop();
  render();
}

function renderResult(): void {
  const total = state.quizQuestions.length;
  const correctCount = score();
  const rate = total === 0 ? 0 : correctCount / total;
  const percentage = Math.round(rate * 100);
  const exam = currentExam();
  const passed = rate >= exam.passingRate;

  // 分野別の正答状況
  const byTopic = new Map<string, { correct: number; total: number }>();
  state.quizQuestions.forEach((q, i) => {
    const label = topicLabel(q);
    const entry = byTopic.get(label) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (isCorrect(q, state.selections[i] ?? [])) entry.correct += 1;
    byTopic.set(label, entry);
  });

  const topicRows = [...byTopic.entries()]
    .map(
      ([label, r]) => `
        <div class="topic-row">
          <span class="topic-row-label">${escapeHtml(label)}</span>
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
            <span class="question-list-title">${escapeHtml(topicLabel(q))}</span>
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
                 ${passed ? "合格ラインに到達しています" : `不合格（合格ラインは ${Math.round(exam.passingRate * 100)}%）`}
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
    scrollToTop();
    render();
  });
  document.querySelectorAll("[data-review]").forEach((el) => {
    el.addEventListener("click", () => {
      state.currentIndex = Number(el.getAttribute("data-review"));
      state.checked[state.currentIndex] = true;
      state.screen = "quiz";
      scrollToTop();
      render();
    });
  });
}

// ------------------------------------------------------------------------ 起動

function startQuiz(mode: Mode): void {
  const exam = currentExam();
  const pool = mode === "exam" ? examQuestions() : questionsByTopic(state.topic);
  // 論点ごとに亜種を1問だけ選び、シャッフルしてから同じ分野が並ばないように配置する
  const perConcept = pickOnePerConcept(pool);
  const limited = shuffle(perConcept).slice(
    0,
    mode === "exam" ? exam.questionCount : perConcept.length,
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
    const perQuestionSec = (exam.minutes * 60) / exam.questionCount;
    state.remainingSec = Math.round(perQuestionSec * picked.length);
    startTimer();
  } else {
    state.remainingSec = 0;
    stopTimer();
  }

  scrollToTop();
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
