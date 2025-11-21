/**
 * Utility functions for streaming text to the console.
 */

import readline from "readline";
import hljs from "highlight.js";

const CODE_BLOCK_REGEX = /```([\w+-]+)?\r?\n([\s\S]*?)```/g;
const ANSI_RESET = "\x1b[0m";
const ANSI_STYLES = {
  keyword: "\x1b[38;5;208m",
  built_in: "\x1b[38;5;75m",
  type: "\x1b[38;5;75m",
  literal: "\x1b[38;5;81m",
  number: "\x1b[38;5;141m",
  string: "\x1b[38;5;114m",
  subst: "\x1b[38;5;117m",
  symbol: "\x1b[38;5;176m",
  variable: "\x1b[38;5;117m",
  templateVariable: "\x1b[38;5;117m",
  comment: "\x1b[38;5;244m",
  quote: "\x1b[38;5;114m",
  meta: "\x1b[38;5;180m",
  metaString: "\x1b[38;5;151m",
  attr: "\x1b[38;5;151m",
  attribute: "\x1b[38;5;151m",
  name: "\x1b[38;5;68m",
  title: "\x1b[38;5;75m",
  section: "\x1b[38;5;117m",
  params: "\x1b[38;5;186m",
  addition: "\x1b[38;5;119m",
  deletion: "\x1b[38;5;203m",
  selectorTag: "\x1b[38;5;68m",
  selectorClass: "\x1b[38;5;151m",
  selectorId: "\x1b[38;5;151m",
  tag: "\x1b[38;5;68m",
  property: "\x1b[38;5;151m",
  punctuation: "\x1b[38;5;249m",
  operator: "\x1b[38;5;249m",
};

const LANGUAGE_ALIASES = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  shell: "bash",
  bash: "bash",
  zsh: "bash",
  ps: "powershell",
  ps1: "powershell",
  cplusplus: "cpp",
  "c++": "cpp",
  "c#": "csharp",
  yml: "yaml",
  md: "markdown",
  htm: "html",
};

const sleep = (ms) =>
  typeof ms === "number" && ms > 0
    ? new Promise((resolve) => setTimeout(resolve, ms))
    : Promise.resolve();

const streamPlainText = async (text, wordDelayMs) => {
  if (!text) {
    return;
  }

  const tokens = text.split(/(\s+)/);

  for (const token of tokens) {
    if (!token) {
      continue;
    }

    process.stdout.write(token);

    if (token.trim()) {
      // Only delay after tokens that contain visible characters.
      await sleep(wordDelayMs);
    }
  }
};

const ENTITY_MAP = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

const decodeHtmlEntities = (input) =>
  input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const isHex = entity[1]?.toLowerCase() === "x";
      const codePoint = isHex
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);

      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    const normalized = entity.toLowerCase();
    return Object.prototype.hasOwnProperty.call(ENTITY_MAP, normalized)
      ? ENTITY_MAP[normalized]
      : match;
  });

const htmlToAnsi = (html) => {
  const spanRegex = /<(\/?)span(?: class="([^"]+)")?>|<br\s*\/>|<br>/gi;
  const styleStack = [];
  let result = "";
  let lastIndex = 0;

  const appendText = (rawText) => {
    if (!rawText) {
      return;
    }

    result += decodeHtmlEntities(rawText);
  };

  const pushStyle = (classes) => {
    const style = classes
      .map((cls) => (cls.startsWith("hljs-") ? cls.slice(5) : cls))
      .map((cls) => ANSI_STYLES[cls] ?? null)
      .find((value) => value);

    styleStack.push(style ?? null);

    if (style) {
      result += style;
    }
  };

  const popStyle = () => {
    const popped = styleStack.pop();

    if (popped) {
      result += ANSI_RESET;
      const parentStyle = [...styleStack].reverse().find((value) => value);

      if (parentStyle) {
        result += parentStyle;
      }
    }
  };

  let match;

  while ((match = spanRegex.exec(html)) !== null) {
    appendText(html.slice(lastIndex, match.index));

    const [fullMatch, closing, classAttr] = match;

    if (/^<br/i.test(fullMatch)) {
      result += "\n";
    } else if (closing) {
      popStyle();
    } else {
      const classes = classAttr ? classAttr.split(/\s+/) : [];
      pushStyle(classes);
    }

    lastIndex = spanRegex.lastIndex;
  }

  appendText(html.slice(lastIndex));

  if (styleStack.some((style) => style)) {
    result += ANSI_RESET;
  }

  return result + ANSI_RESET;
};

const normalizeLanguage = (language) => {
  if (!language) {
    return null;
  }

  const normalized = language.trim().toLowerCase();
  const alias = LANGUAGE_ALIASES[normalized] ?? normalized;

  return hljs.getLanguage(alias) ? alias : null;
};

const highlightCode = (code, language) => {
  try {
    const normalizedLanguage = normalizeLanguage(language);

    const { value } = normalizedLanguage
      ? hljs.highlight(code, { language: normalizedLanguage, ignoreIllegals: true })
      : hljs.highlightAuto(code);

    const ansi = htmlToAnsi(value);

    return /\n\x1b\[0m$/.test(ansi) ? ansi : ansi.replace(/\x1b\[0m$/, `\n${ANSI_RESET}`);
  } catch (error) {
    return code.endsWith("\n") ? code : `${code}\n`;
  }
};

const streamCodeBlock = (code, language) => {
  const trimmedLanguage = language ? language.trim() : "";
  const openingFence = trimmedLanguage
    ? `\`\`\`${trimmedLanguage}`
    : "```";

  process.stdout.write(openingFence + "\n");
  const highlighted = highlightCode(code, trimmedLanguage);
  process.stdout.write(highlighted);

  process.stdout.write("```");
};

/**
 * Stream text to the console with optional ANSI highlighted code blocks.
 * @param {string} text - The text to stream.
 * @param {string} prefix - Prefix to add before the text (e.g., "[AI Name]: ").
 * @param {number} wordDelayMs - Delay between tokens in milliseconds.
 * @returns {Promise<void>} Promise that resolves when streaming is complete.
 */
export const streamText = async (text, prefix = "", wordDelayMs = 30) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const safePrefix = typeof prefix === "string" ? prefix : String(prefix ?? "");
  const safeText = typeof text === "string" ? text : String(text ?? "");

  process.stdout.write(safePrefix);

  CODE_BLOCK_REGEX.lastIndex = 0;
  let lastIndex = 0;
  let match;

  while ((match = CODE_BLOCK_REGEX.exec(safeText)) !== null) {
    const [fullMatch, rawLanguage, code] = match;
    const preceding = safeText.slice(lastIndex, match.index);

    await streamPlainText(preceding, wordDelayMs);

    streamCodeBlock(code, rawLanguage);

    lastIndex = match.index + fullMatch.length;
  }

  const remaining = safeText.slice(lastIndex);
  await streamPlainText(remaining, wordDelayMs);

  if (!safeText.endsWith("\n")) {
    process.stdout.write("\n");
  }

  rl.close();
};

export default streamText;
