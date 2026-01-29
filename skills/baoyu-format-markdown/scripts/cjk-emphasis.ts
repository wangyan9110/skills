const CJK_PUNCT_COMMON = "。．，、？！：；";
const CJK_OPENING_PUNCT = "（〔〖〘〚「『〈《【\u201C\u2018";
const CJK_CLOSING_PUNCT = "）〕〗〙〛」』〉》】\u201D\u2019" + CJK_PUNCT_COMMON;
const CJK_SCRIPTS =
  "\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}";

export const CJK_CLOSING_PUNCT_RE = new RegExp(`[${CJK_CLOSING_PUNCT}]`);
export const CJK_OPENING_PUNCT_RE = new RegExp(`^[${CJK_OPENING_PUNCT}]`);
export const CJK_CHAR_RE = new RegExp(`[${CJK_SCRIPTS}]`, "u");

const PUNCT_OR_SYMBOL_RE = /[\p{P}\p{S}]/u;
const WORD_CHAR_RE = /[\p{L}\p{N}]/u;

function findInlineCodeRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== "`") {
      i += 1;
      continue;
    }

    let run = 1;
    while (i + run < text.length && text[i + run] === "`") {
      run += 1;
    }

    const start = i;
    let j = i + run;
    let found = false;
    while (j < text.length) {
      if (text[j] !== "`") {
        j += 1;
        continue;
      }
      let closeRun = 1;
      while (j + closeRun < text.length && text[j + closeRun] === "`") {
        closeRun += 1;
      }
      if (closeRun === run) {
        ranges.push([start, j + closeRun - 1]);
        i = j + closeRun;
        found = true;
        break;
      }
      j += closeRun;
    }

    if (!found) {
      i = start + run;
    }
  }
  return ranges;
}

function isEscaped(text: string, pos: number): boolean {
  let count = 0;
  for (let i = pos - 1; i >= 0 && text[i] === "\\"; i -= 1) {
    count += 1;
  }
  return count % 2 === 1;
}

function isWhitespaceChar(ch: string | undefined): boolean {
  return !ch || /\s/u.test(ch);
}

function isPunctuationOrSymbol(ch: string | undefined): boolean {
  return !!ch && PUNCT_OR_SYMBOL_RE.test(ch);
}

function fixCjkEmphasisSpacingInBlock(block: string): string {
  const codeRanges = findInlineCodeRanges(block);
  let rangeIndex = 0;

  const delimiters: Array<{
    pos: number;
    canOpen: boolean;
    canClose: boolean;
  }> = [];
  let cursor = 0;
  while (cursor < block.length - 1) {
    if (rangeIndex < codeRanges.length && cursor >= codeRanges[rangeIndex][0]) {
      if (cursor <= codeRanges[rangeIndex][1]) {
        cursor = codeRanges[rangeIndex][1] + 1;
        continue;
      }
      rangeIndex += 1;
      continue;
    }

    if (
      block[cursor] === "*" &&
      block[cursor + 1] === "*" &&
      block[cursor - 1] !== "*" &&
      block[cursor + 2] !== "*" &&
      !isEscaped(block, cursor)
    ) {
      const before = block[cursor - 1];
      const after = block[cursor + 2];
      const beforeIsSpace = isWhitespaceChar(before);
      const afterIsSpace = isWhitespaceChar(after);
      const beforeIsPunct = isPunctuationOrSymbol(before);
      const afterIsPunct = isPunctuationOrSymbol(after);
      const leftFlanking =
        !afterIsSpace && (!afterIsPunct || beforeIsSpace || beforeIsPunct);
      const rightFlanking =
        !beforeIsSpace && (!beforeIsPunct || afterIsSpace || afterIsPunct);
      const cjkPunctBefore = !!before && CJK_CLOSING_PUNCT_RE.test(before);
      const wordAfter = !!after && WORD_CHAR_RE.test(after);

      delimiters.push({
        pos: cursor,
        canOpen: leftFlanking,
        canClose: rightFlanking || (cjkPunctBefore && wordAfter),
      });
      cursor += 2;
      continue;
    }

    cursor += 1;
  }

  const stack: Array<{ pos: number }> = [];
  const pairs: Array<{ open: number; close: number }> = [];
  for (const delimiter of delimiters) {
    if (delimiter.canClose) {
      let openerIndex = -1;
      for (let j = stack.length - 1; j >= 0; j -= 1) {
        openerIndex = j;
        break;
      }
      if (openerIndex !== -1) {
        const opener = stack.splice(openerIndex, 1)[0];
        pairs.push({ open: opener.pos, close: delimiter.pos });
      }
    }
    if (delimiter.canOpen) {
      stack.push({ pos: delimiter.pos });
    }
  }

  if (pairs.length === 0) return block;

  const insertPositions = new Set<number>();
  for (const pair of pairs) {
    const insideLast = block[pair.close - 1];
    const afterClose = block[pair.close + 2];
    if (!afterClose) continue;
    if (
      CJK_CLOSING_PUNCT_RE.test(insideLast) &&
      WORD_CHAR_RE.test(afterClose)
    ) {
      insertPositions.add(pair.close + 2);
    }
  }

  if (insertPositions.size === 0) return block;

  let result = "";
  for (let idx = 0; idx < block.length; idx += 1) {
    if (insertPositions.has(idx)) {
      result += " ";
    }
    result += block[idx];
  }
  if (insertPositions.has(block.length)) {
    result += " ";
  }
  return result;
}

export function fixCjkEmphasisSpacing(content: string): string {
  const parts = content.split(/(^```[\s\S]*?^```|^~~~[\s\S]*?^~~~)/m);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part;
      const blocks = part.split(/(\n\s*\n+)/);
      return blocks
        .map((block, index) => {
          if (index % 2 === 1) return block;
          return fixCjkEmphasisSpacingInBlock(block);
        })
        .join("");
    })
    .join("");
}
