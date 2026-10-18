/**
 * MessageMarkdown - renders a message body as markdown. Human, AI and @Chat
 * messages all go through here so links, mentions and code look the same
 * whoever wrote them.
 */

import { useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { formatMentionsForMarkdown } from "@/utils/chatMentions";
import MarkdownCodeBlock from "./MarkdownCodeBlock";
import type { AiParticipant } from "@/config/aiParticipants";

// gfm turns bare URLs into links; breaks keeps a typed newline as a new line
// instead of folding it into the paragraph, as people expect in a chat box
const REMARK_PLUGINS = [remarkGfm, remarkBreaks];

const MARKDOWN_COMPONENTS_BASE = {
  h1: ({ children }: { children?: React.ReactNode }) => <h4>{children}</h4>,
  h2: ({ children }: { children?: React.ReactNode }) => <h4>{children}</h4>,
  h3: "h3" as const,
  pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="markdown-list">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="markdown-list">{children}</ol>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="markdown-link"
    >
      {children}
    </a>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="markdown-table">
      <table>{children}</table>
    </div>
  ),
};

interface MessageMarkdownProps {
  content: string;
  aiParticipants: AiParticipant[];
  participantMentions: string[];
}

const MessageMarkdown = ({
  content,
  aiParticipants,
  participantMentions,
}: MessageMarkdownProps) => {
  const renderMarkdownCode = useCallback(
    (props: {
      className?: string;
      children?: React.ReactNode;
      node?: { type?: string };
    }) => (
      <MarkdownCodeBlock
        {...props}
        aiParticipants={aiParticipants}
        participantMentions={participantMentions}
      />
    ),
    [aiParticipants, participantMentions],
  );

  const markdownComponents = useMemo(
    () => ({ ...MARKDOWN_COMPONENTS_BASE, code: renderMarkdownCode }),
    [renderMarkdownCode],
  );

  const markdown = useMemo(
    () =>
      formatMentionsForMarkdown(content, aiParticipants, participantMentions),
    [content, aiParticipants, participantMentions],
  );

  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      components={markdownComponents}
    >
      {markdown}
    </ReactMarkdown>
  );
};

export default MessageMarkdown;
