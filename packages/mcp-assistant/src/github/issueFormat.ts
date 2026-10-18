/**
 * Builds the body of an issue @Chat files. The model writes the spec
 * fields; the transcript, the requester and the metadata come from the app,
 * so the context can't be invented and nothing in it pings real GitHub users.
 */

import {
  ISSUE_FIELD_MAX_CHARS,
  ISSUE_MAX_CRITERIA,
  ISSUE_METADATA_MARKER,
  ISSUE_TITLE_MAX_CHARS,
  ISSUE_TRANSCRIPT_MESSAGE_CHARS,
  ISSUE_TRANSCRIPT_MESSAGES,
} from "./constants.js";

export type IssueKind = "feature" | "bug";

/** What the model writes, from the create_github_issue tool input. */
export type IssueSpec = {
  kind: IssueKind;
  title: string;
  summary: string;
  motivation: string;
  proposal: string;
  acceptanceCriteria: string[];
  openQuestions: string[];
};

export type TranscriptLine = {
  sender: string;
  senderType: string;
  content: string;
};

/** Who asked and where - supplied by the app, never by the model. */
export type IssueOrigin = {
  requestedBy: string;
  requesterType: "human" | "ai";
  roomId: string;
  transcript: TranscriptLine[];
  filedAt: Date;
  model: string;
};

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;

/**
 * Makes chat text safe to paste into an issue: "@claude" would notify the
 * GitHub user named claude, and an image link would load on every view.
 */
export const neutralizeForGitHub = (text: string): string =>
  text
    .replace(/(^|[^\w`])@([A-Za-z0-9][\w.-]*)/g, "$1`@$2`")
    .replace(/!\[/g, "!\\[");

const clean = (text: string, max = ISSUE_FIELD_MAX_CHARS): string =>
  neutralizeForGitHub(truncate(text.trim(), max));

export const formatIssueTitle = (title: string): string =>
  truncate(title.replace(/\s+/g, " ").trim(), ISSUE_TITLE_MAX_CHARS);

const section = (heading: string, body: string): string[] =>
  body.trim() ? [`## ${heading}`, "", clean(body), ""] : [];

// Criteria are things to tick off; questions are just listed
const list = (heading: string, items: string[], bullet: string): string[] => {
  const lines = items
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, ISSUE_MAX_CRITERIA)
    .map((item) => `${bullet} ${clean(item, ISSUE_TRANSCRIPT_MESSAGE_CHARS)}`);
  return lines.length ? [`## ${heading}`, "", ...lines, ""] : [];
};

const kindLabel = (senderType: string): string =>
  senderType === "ai" ? "AI" : "human";

const speakerLabel = ({ sender, senderType }: TranscriptLine): string =>
  `${sender} (${kindLabel(senderType)})`;

/** The messages that go into the issue: the latest non-empty ones. */
export const selectTranscript = (
  transcript: TranscriptLine[],
): TranscriptLine[] =>
  transcript
    .filter(({ content }) => content.trim())
    .slice(-ISSUE_TRANSCRIPT_MESSAGES);

/** Messages as one quoted, mention-free block, a blank quote line apart. */
export const formatTranscript = (transcript: TranscriptLine[]): string[] =>
  transcript
    .map(
      (line) =>
        `> **${neutralizeForGitHub(speakerLabel(line))}:** ${clean(
          line.content.replace(/\s+/g, " "),
          ISSUE_TRANSCRIPT_MESSAGE_CHARS,
        )}`,
    )
    .flatMap((line, index) => (index === 0 ? [line] : [">", line]));

export const formatIssueBody = (
  spec: IssueSpec,
  origin: IssueOrigin,
): string => {
  const date = origin.filedAt.toISOString().slice(0, 10);
  const requester = `**${neutralizeForGitHub(origin.requestedBy)}** (${kindLabel(origin.requesterType)})`;
  const transcript = selectTranscript(origin.transcript);
  const metadata = {
    requestedBy: origin.requestedBy,
    requesterType: origin.requesterType,
    roomId: origin.roomId,
    filedAt: origin.filedAt.toISOString(),
    model: origin.model,
  };

  return [
    `> Filed by \`@Chat\` in Vibe Chat on ${date}, at the request of ${requester}. Not reviewed by a maintainer yet.`,
    "",
    ...section("Summary", spec.summary),
    ...section("Why", spec.motivation),
    ...section(
      spec.kind === "bug" ? "Expected behaviour" : "Proposal",
      spec.proposal,
    ),
    ...list("Acceptance criteria", spec.acceptanceCriteria, "- [ ]"),
    ...list("Open questions", spec.openQuestions, "-"),
    ...(transcript.length
      ? [
          "<details>",
          `<summary>Chat context (last ${transcript.length} messages)</summary>`,
          "",
          ...formatTranscript(transcript),
          "",
          "</details>",
          "",
        ]
      : []),
    // "--" escaped so no value can close the comment early
    `<!-- ${ISSUE_METADATA_MARKER} ${JSON.stringify(metadata).replace(/--/g, "-\\u002d")} -->`,
  ].join("\n");
};
