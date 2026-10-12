/**
 * Deliberately rudimentary HTML -> text: regexes, no DOM. Good enough to
 * hand a model the readable gist of a page; not a general HTML parser.
 */

export type PageLink = { text: string; url: string };

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  copy: "©",
};

const decodeEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const codePoint =
        entity[1].toLowerCase() === "x"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });

const stripTags = (html: string): string =>
  decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

// Elements whose content is never readable text
const NON_CONTENT_ELEMENTS =
  /<(script|style|noscript|svg|template|iframe|head)\b[\s\S]*?<\/\1>/gi;
const BLOCK_BOUNDARY =
  /<\/?(p|div|section|article|main|header|footer|li|tr|h[1-6]|pre|blockquote|table|ul|ol)\b[^>]*>|<br\s*\/?>/gi;

export const extractTitle = (html: string): string | null => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripTags(match[1]) || null : null;
};

export const htmlToText = (html: string): string =>
  decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(NON_CONTENT_ELEMENTS, " ")
      .replace(BLOCK_BOUNDARY, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

export const extractLinks = (
  html: string,
  baseUrl: URL,
  limit: number,
): PageLink[] => {
  const links: PageLink[] = [];
  const seen = new Set<string>();
  const anchor =
    /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const [, href, inner] of html.matchAll(anchor)) {
    if (links.length >= limit) break;
    let resolved: URL;
    try {
      resolved = new URL(decodeEntities(href), baseUrl);
    } catch {
      continue;
    }
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      continue;
    }
    resolved.hash = "";
    const text = stripTags(inner);
    if (!text || seen.has(resolved.href)) continue;
    seen.add(resolved.href);
    links.push({ text, url: resolved.href });
  }
  return links;
};
