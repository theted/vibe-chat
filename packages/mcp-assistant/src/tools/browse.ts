import {
  extractLinks,
  extractTitle,
  htmlToText,
  type PageLink,
} from "./htmlToText.js";
import { assertPublicUrl, UnsafeUrlError } from "./urlSafety.js";

const BROWSE_TIMEOUT_MS = 10_000;
const BROWSE_MAX_BYTES = 2_000_000;
const BROWSE_MAX_CHARS = 12_000;
const BROWSE_MAX_LINKS = 25;
const BROWSE_MAX_REDIRECTS = 4;
const USER_AGENT =
  "Mozilla/5.0 (compatible; VibeChatBot/1.0; +https://github.com/theted/vibe-chat)";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const TEXT_CONTENT_TYPE =
  /^(text\/|application\/(json|xml|xhtml\+xml|rss\+xml|atom\+xml|ld\+json))/i;

export type BrowseResult = {
  url: string;
  status: number;
  title: string | null;
  text: string;
  isTruncated: boolean;
  links: PageLink[];
};

export class BrowseError extends Error {}

/** Reads at most maxBytes, so a huge or endless body can't exhaust memory. */
const readCappedBody = async (
  response: Response,
  maxBytes: number,
): Promise<string> => {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  while (received < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    text += decoder.decode(value, { stream: true });
  }
  await reader.cancel().catch(() => undefined);
  return text + decoder.decode();
};

/**
 * Follows redirects by hand so every hop goes through the SSRF check -
 * fetch's automatic redirects would skip it.
 */
const fetchPublicPage = async (rawUrl: string): Promise<Response> => {
  let url = await assertPublicUrl(rawUrl);
  for (let hop = 0; hop <= BROWSE_MAX_REDIRECTS; hop += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(BROWSE_TIMEOUT_MS),
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,text/plain,application/json;q=0.9,*/*;q=0.5",
      },
    });

    const location = response.headers.get("location");
    if (!REDIRECT_STATUSES.has(response.status) || !location) {
      return response;
    }
    await response.body?.cancel().catch(() => undefined);
    url = await assertPublicUrl(new URL(location, url).href);
  }
  throw new BrowseError(`Gave up after ${BROWSE_MAX_REDIRECTS} redirects.`);
};

export const browse = async (rawUrl: string): Promise<BrowseResult> => {
  let response: Response;
  try {
    response = await fetchPublicPage(rawUrl);
  } catch (error) {
    if (error instanceof UnsafeUrlError || error instanceof BrowseError) {
      throw error;
    }
    const reason =
      error instanceof Error && error.name === "TimeoutError"
        ? `timed out after ${BROWSE_TIMEOUT_MS / 1000}s`
        : (error as Error).message;
    throw new BrowseError(`Could not fetch ${rawUrl}: ${reason}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !TEXT_CONTENT_TYPE.test(contentType)) {
    await response.body?.cancel().catch(() => undefined);
    throw new BrowseError(
      `${response.url || rawUrl} is ${contentType.split(";")[0]}, which browse can't read (text and HTML only).`,
    );
  }

  const body = await readCappedBody(response, BROWSE_MAX_BYTES);
  const finalUrl = new URL(response.url || rawUrl);
  const isHtml =
    /html/i.test(contentType) || /^\s*<(!doctype|html)/i.test(body);
  const fullText = isHtml ? htmlToText(body) : body.trim();

  return {
    url: finalUrl.href,
    status: response.status,
    title: isHtml ? extractTitle(body) : null,
    text: fullText.slice(0, BROWSE_MAX_CHARS),
    isTruncated: fullText.length > BROWSE_MAX_CHARS,
    links: isHtml ? extractLinks(body, finalUrl, BROWSE_MAX_LINKS) : [],
  };
};

export const formatBrowseResult = (result: BrowseResult): string => {
  const header = [
    `URL: ${result.url}`,
    `HTTP status: ${result.status}`,
    result.title ? `Title: ${result.title}` : null,
  ].filter(Boolean);
  const links = result.links.length
    ? `\n\nLinks on the page:\n${result.links
        .map((link) => `- ${link.text} -> ${link.url}`)
        .join("\n")}`
    : "";
  const truncation = result.isTruncated
    ? `\n[... page truncated at ${BROWSE_MAX_CHARS} characters]`
    : "";
  return `${header.join("\n")}\n\n${result.text || "(no readable text)"}${truncation}${links}`;
};
