/**
 * Models lean on em dashes, and in a chat they read as machine-written
 * (issue #290). The prompt asks every AI not to use them; this catches the
 * ones that slip through before a reply is posted.
 */

// Code spans come first in the alternation so dashes inside them are kept;
// fenced blocks before inline ones, or a ``` fence reads as an empty span
const CODE_OR_DASH_PATTERN =
  /(```[\s\S]*?(?:```|$)|`[^`\n]*`)|[^\S\n]*[—–]+[^\S\n]*/g;
const DIGIT_PATTERN = /\d/;

const isDigit = (char: string | undefined): boolean =>
  char !== undefined && DIGIT_PATTERN.test(char);

/**
 * Replace em dashes, and en dashes used as dashes, with " - ". An en dash
 * between digits is a range and becomes a plain hyphen (1990–2000 →
 * 1990-2000). Code spans and fenced code blocks are left as written.
 * @param text - Reply text from a model
 * @returns The text without em or en dashes outside code
 */
export const replaceLongDashes = (text: string): string =>
  text.replace(
    CODE_OR_DASH_PATTERN,
    (match: string, code: string | undefined, offset: number) => {
      if (code) return code;
      const before = text[offset - 1];
      const after = text[offset + match.length];
      if (match === "–" && isDigit(before) && isDigit(after)) return "-";
      // A reply that opens with a dash ("[reply #3] — fair point") reads
      // fine without it, and a bare "- " there would render as a bullet
      if (offset === 0) return "";
      const isLineStart = before === "\n";
      const isLineEnd = after === undefined || after === "\n";
      return `${isLineStart ? "" : " "}-${isLineEnd ? "" : " "}`;
    },
  );
