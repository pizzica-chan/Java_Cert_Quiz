const MODIFIERS =
  /\b(public|private|protected|static|final|abstract|synchronized|volatile|native|transient|strictfp)\b/g;

const PRIMITIVES = /\b(void|int|long|boolean|double|float|char|byte|short)\b/g;

const KEYWORDS =
  /\b(class|interface|enum|extends|implements|return|if|else|for|while|do|try|catch|finally|throw|throws|new|import|package|this|super|instanceof|switch|case|default|break|continue|assert)\b/g;

const METHOD_NOT =
  /^(if|while|for|switch|catch|try|synchronized|return|throw|new|super|this)$/;

const LITERALS = /\b(null|true|false)\b/g;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function protectEntities(text: string, stash: (html: string) => string): string {
  return text.replace(/&(lt|gt|amp|quot);/g, (entity) => stash(entity));
}

function escapePlainSegment(text: string, stash: (html: string) => string): string {
  return protectEntities(escapeHtml(text), stash);
}

function mapPlain(text: string, fn: (plain: string) => string): string {
  return text
    .split(/(\x00PH\d+\x00)/)
    .map((part) => (/^\x00PH\d+\x00$/.test(part) ? part : fn(part)))
    .join("");
}

function spanToken(
  className: string,
  text: string,
  sym: string | null,
  lineNo: number,
  activeSym: string | null,
  activeLine: number | null,
): string {
  const classes = [className];
  if (sym) classes.push("sym");
  if (sym && activeSym === sym) {
    classes.push("sym-highlight");
    if (activeLine === lineNo) classes.push("sym-active");
  }
  const dataSym = sym ? ` data-sym="${escapeHtml(sym)}"` : "";
  return `<span class="${classes.join(" ")}"${dataSym}>${text}</span>`;
}

function stashToken(
  stash: (html: string) => string,
  className: string,
  text: string,
  sym: string | null,
  lineNo: number,
  activeSym: string | null,
  activeLine: number | null,
): string {
  return stash(spanToken(className, text, sym, lineNo, activeSym, activeLine));
}

/** 文字列・コメント内の波括弧を無視して、各行の開始時点の深さを返す */
export function computeBraceDepths(lines: string[]): number[] {
  const depths: number[] = [];
  let depth = 0;
  let inBlockComment = false;

  for (const line of lines) {
    depths.push(depth);

    let i = 0;
    let inString = false;
    let inLineComment = false;

    while (i < line.length) {
      const ch = line[i]!;
      const next = line[i + 1];

      if (inBlockComment) {
        if (ch === "*" && next === "/") {
          inBlockComment = false;
          i += 2;
          continue;
        }
        i += 1;
        continue;
      }

      if (inLineComment) {
        break;
      }

      if (inString) {
        if (ch === "\\") {
          i += 2;
          continue;
        }
        if (ch === '"') inString = false;
        i += 1;
        continue;
      }

      if (ch === "/" && next === "/") {
        inLineComment = true;
        break;
      }
      if (ch === "/" && next === "*") {
        inBlockComment = true;
        i += 2;
        continue;
      }
      if (ch === '"') {
        inString = true;
        i += 1;
        continue;
      }

      if (ch === "{") depth += 1;
      else if (ch === "}" && depth > 0) depth -= 1;
      i += 1;
    }
  }

  return depths;
}

function parenDepthAt(text: string, index: number): number {
  let depth = 0;
  for (let i = 0; i < index; i++) {
    const ch = text[i];
    if (ch === "(") depth += 1;
    else if (ch === ")" && depth > 0) depth -= 1;
  }
  return depth;
}

function replaceTypeNames(
  plain: string,
  isFieldContext: boolean,
  tok: (cls: string, text: string, sym?: string | null) => string,
): string {
  const re = /\b([A-Z][a-zA-Z0-9]*)\s+([a-z][a-zA-Z0-9]*)\b/g;
  let out = "";
  let last = 0;

  for (const match of plain.matchAll(re)) {
    const index = match.index ?? 0;
    out += plain.slice(last, index);

    const type = match[1]!;
    const name = match[2]!;
    const insideParens = parenDepthAt(plain, index) > 0;
    // クラス本体かつ括弧外 → フィールド、それ以外 → ローカル/引数
    const cls = isFieldContext && !insideParens ? "tok-field" : "tok-var";

    out += `${tok("tok-type", type, type)} ${tok(cls, name, name)}`;
    last = index + match[0].length;
  }

  return out + plain.slice(last);
}

/**
 * @param braceDepth 行開始時点の波括弧の深さ（クラス本体=1、メソッド内>=2）
 */
export function highlightJava(
  line: string,
  lineNo: number,
  activeSym: string | null,
  activeLine: number | null,
  braceDepth = 1,
): string {
  if (!line.trim()) return escapeHtml(line);

  const placeholders: string[] = [];
  const stash = (html: string): string => {
    const id = placeholders.length;
    placeholders.push(html);
    return `\x00PH${id}\x00`;
  };

  const tok = (cls: string, text: string, sym: string | null = text) =>
    stashToken(stash, cls, text, sym, lineNo, activeSym, activeLine);

  // クラス本体（depth 1）のみフィールド宣言コンテキスト。
  // depth 0 はクラス宣言前、depth >= 2 はメソッド/初期化ブロック内。
  const isFieldContext = braceDepth === 1;

  let work = line;

  work = work.replace(/(\/\*.*?\*\/)/g, (m) =>
    stash(`<span class="tok-cmt">${escapeHtml(m)}</span>`),
  );
  work = work.replace(/(\/\/.*)$/g, (m) => stash(`<span class="tok-cmt">${escapeHtml(m)}</span>`));
  work = work.replace(/("(?:\\.|[^"\\])*")/g, (m) =>
    stash(`<span class="tok-str">${escapeHtml(m)}</span>`),
  );

  work = work
    .split(/(\x00PH\d+\x00)/)
    .map((part) => (/^\x00PH\d+\x00$/.test(part) ? part : escapePlainSegment(part, stash)))
    .join("");

  work = mapPlain(work, (plain) =>
    plain.replace(/@([A-Za-z_]\w*)/g, (_, name) => tok("tok-ann", `@${name}`, name)),
  );

  work = mapPlain(work, (plain) =>
    plain.replace(/\b(\d+(?:_\d+)*)\b/g, (_, n) => tok("tok-num", n, null)),
  );

  work = mapPlain(work, (plain) =>
    plain.replace(/\b(class|interface|enum)\s+([A-Za-z_]\w*)/g, (_, kw, name) => {
      const kwSpan = tok("tok-kw", kw, null);
      const nameSpan = tok("tok-class", name, name);
      return `${kwSpan} ${nameSpan}`;
    }),
  );

  work = mapPlain(work, (plain) =>
    plain.replace(/\bnew\s+([A-Za-z_]\w*)/g, (_, type) => {
      const newSpan = tok("tok-kw", "new", null);
      const typeSpan = tok("tok-type", type, type);
      return `${newSpan} ${typeSpan}`;
    }),
  );

  work = mapPlain(work, (plain) =>
    plain.replace(/\b(extends|implements)\s+([A-Za-z_]\w*)/g, (_, kw, type) => {
      const kwSpan = tok("tok-kw", kw, null);
      const typeSpan = tok("tok-type", type, type);
      return `${kwSpan} ${typeSpan}`;
    }),
  );

  // instanceof Type name → パターン変数はローカル扱い
  work = mapPlain(work, (plain) =>
    plain.replace(
      /\binstanceof\s+([A-Z][a-zA-Z0-9]*)\s+([a-z][a-zA-Z0-9]*)\b/g,
      (_, type, name) => {
        const kwSpan = tok("tok-kw", "instanceof", null);
        const typeSpan = tok("tok-type", type, type);
        const nameSpan = tok("tok-var", name, name);
        return `${kwSpan} ${typeSpan} ${nameSpan}`;
      },
    ),
  );

  work = mapPlain(work, (plain) =>
    plain.replace(/\b([A-Z][A-Z0-9_]+)\b/g, (match) => tok("tok-const", match, match)),
  );

  work = mapPlain(work, (plain) =>
    plain.replace(/\b([a-z][a-zA-Z0-9]*)\s*\(/g, (full, name) => {
      if (METHOD_NOT.test(name)) return full;
      return `${tok("tok-meth", name, name)}(`;
    }),
  );

  work = mapPlain(work, (plain) =>
    plain.replace(/\b([A-Z][a-zA-Z0-9]*)\.([a-z][a-zA-Z0-9_]*)\b/g, (_, type, member) => {
      const typeSpan = tok("tok-type", type, type);
      const memberSpan = tok("tok-field", member, member);
      return `${typeSpan}.${memberSpan}`;
    }),
  );

  work = mapPlain(work, (plain) => replaceTypeNames(plain, isFieldContext, tok));

  work = mapPlain(work, (plain) =>
    plain.replace(MODIFIERS, (match) => tok("tok-mod", match, null)),
  );

  work = mapPlain(work, (plain) =>
    plain.replace(PRIMITIVES, (match) => tok("tok-prim", match, null)),
  );

  work = mapPlain(work, (plain) =>
    plain.replace(LITERALS, (match) => tok("tok-lit", match, null)),
  );

  work = mapPlain(work, (plain) =>
    plain.replace(KEYWORDS, (match) => tok("tok-kw", match, null)),
  );

  work = mapPlain(work, (plain) =>
    plain.replace(/\b([A-Z][a-zA-Z0-9]*)\b/g, (match) => tok("tok-type", match, match)),
  );

  work = mapPlain(work, (plain) =>
    plain.replace(/\b([a-z][a-zA-Z0-9_]*)\b/g, (match) => tok("tok-var", match, match)),
  );

  return work.replace(/\x00PH(\d+)\x00/g, (_, index) => placeholders[Number(index)]!);
}
