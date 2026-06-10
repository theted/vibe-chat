/**
 * MarkdownCodeBlock Component - code renderer for chat markdown: renders
 * mention-only code spans as chips, short snippets as inline code, and
 * multi-line blocks with syntax highlighting.
 */

import type { ReactNode } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism/index.js";
import { findMentionMatches } from "@/utils/mentions";
import type { AiParticipant } from "@/config/aiParticipants";

const SYNTAX_HIGHLIGHTER_STYLE: React.CSSProperties = {
  background: "transparent",
  margin: "15px 0",
  padding: 10,
};
const CODE_TAG_STYLE: React.CSSProperties = { fontFamily: "inherit" };

interface MarkdownCodeBlockProps {
  className?: string;
  children?: ReactNode;
  node?: { type?: string };
  aiParticipants: AiParticipant[];
  participantMentions: string[];
}

const MarkdownCodeBlock = ({
  className,
  children,
  node,
  aiParticipants,
  participantMentions,
  ...props
}: MarkdownCodeBlockProps) => {
  const languageMatch = /language-([\w+#-]+)/.exec(className || "");
  const normalizedChildren = String(children).replace(/\n$/, "");
  const trimmedChildren = normalizedChildren.trim();
  const mentionMatches = findMentionMatches(trimmedChildren, aiParticipants, participantMentions);
  const mentionMatch = mentionMatches.find(
    (match) => match.start === 0 && match.end === trimmedChildren.length,
  );

  if (mentionMatch || (trimmedChildren.startsWith("@") && !normalizedChildren.includes("\n"))) {
    return <span className="mention-chip">{trimmedChildren}</span>;
  }

  // Detect inline code: no language class and not a block-level code node
  const isInline = !languageMatch && node?.type !== "code";

  if (isInline || !normalizedChildren.includes("\n")) {
    return (
      <code className={`inline-code ${className || ""}`} {...props}>
        {normalizedChildren}
      </code>
    );
  }

  return (
    <SyntaxHighlighter
      language={languageMatch ? languageMatch[1] : "text"}
      style={oneDark}
      PreTag="pre"
      wrapLongLines
      customStyle={SYNTAX_HIGHLIGHTER_STYLE}
      codeTagProps={{ style: CODE_TAG_STYLE }}
      className={`code-block ${className || ""}`.trim()}
      {...props}
    >
      {normalizedChildren}
    </SyntaxHighlighter>
  );
};

export default MarkdownCodeBlock;
