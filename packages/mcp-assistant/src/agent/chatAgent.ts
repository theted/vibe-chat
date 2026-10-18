/**
 * The @Chat agent: a hand-written tool-use loop over the Messages API.
 * A manual loop (instead of the SDK's beta toolRunner) keeps every step
 * visible and lets the last round force a text answer.
 */

import type Anthropic from "@anthropic-ai/sdk";

import type { CodeSnippet } from "../codeSearch.js";
import type { CreatedIssue } from "../github/githubIssues.js";
import { AGENT_TOOLS, AGENT_TOOLS_WITH_ISSUES } from "../tools/definitions.js";
import { executeTool, type ToolContext } from "../tools/executeTool.js";
import {
  buildQuestionMessage,
  CHAT_AGENT_SYSTEM_PROMPT,
  type HistoryLine,
  ISSUE_FILING_GUIDANCE,
} from "./prompts.js";

export const DEFAULT_AGENT_MODEL = "claude-opus-5-5";
export const AGENT_MODEL_ENV = "CHAT_ASSISTANT_MODEL";

const AGENT_MAX_TOKENS = 16_000;
// Rounds of client tool calls before the model must answer with what it has
const AGENT_MAX_TOOL_ROUNDS = 5;
const AGENT_EFFORT = "medium";
// On a safety refusal the API re-runs the request on a fallback model
const SERVER_FALLBACK_BETA = "server-side-fallback-2026-07-01";

const REFUSAL_ANSWER =
  "I can't help with that one - try asking it a different way.";

type BetaMessage = Anthropic.Beta.BetaMessage;
type BetaMessageParam = Anthropic.Beta.BetaMessageParam;
type BetaToolUseBlock = Anthropic.Beta.BetaToolUseBlock;
type BetaToolResultBlockParam = Anthropic.Beta.BetaToolResultBlockParam;

export type ChatAgentRequest = {
  question: string;
  askedBy?: string;
  history: HistoryLine[];
};

export type ChatAgentDeps = {
  client: Anthropic;
  model: string;
  tools: ToolContext;
};

export type ChatAgentResult = {
  answer: string;
  /** Every code chunk search_codebase returned during the run */
  snippets: CodeSnippet[];
  toolCalls: string[];
  issuesFiled: CreatedIssue[];
};

const extractText = (message: BetaMessage): string =>
  message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    // Cited web-search text arrives split into several blocks mid-sentence
    .join("")
    .trim();

const logRound = (round: number, response: BetaMessage): void => {
  const { usage } = response;
  const tools = response.content
    .flatMap((block) =>
      block.type === "tool_use" || block.type === "server_tool_use"
        ? [block.name]
        : [],
    )
    .join(", ");
  console.info(
    `[ChatAgent] round ${round}: stop=${response.stop_reason} model=${response.model}` +
      `${tools ? ` tools=[${tools}]` : ""} in=${usage.input_tokens}` +
      ` cache_read=${usage.cache_read_input_tokens ?? 0}` +
      ` cache_write=${usage.cache_creation_input_tokens ?? 0} out=${usage.output_tokens}`,
  );
};

export const runChatAgent = async (
  request: ChatAgentRequest,
  { client, model, tools }: ChatAgentDeps,
): Promise<ChatAgentResult> => {
  const messages: BetaMessageParam[] = [
    { role: "user", content: buildQuestionMessage(request) },
  ];
  const snippets: CodeSnippet[] = [];
  const toolCalls: string[] = [];
  const issuesFiled = tools.issues?.filed ?? [];
  // Two fixed variants, so each keeps its own stable prompt-cache prefix
  const canUseIssues = Boolean(tools.issues);
  const system = canUseIssues
    ? CHAT_AGENT_SYSTEM_PROMPT + ISSUE_FILING_GUIDANCE
    : CHAT_AGENT_SYSTEM_PROMPT;
  const agentTools = canUseIssues ? AGENT_TOOLS_WITH_ISSUES : AGENT_TOOLS;

  for (let round = 0; round <= AGENT_MAX_TOOL_ROUNDS; round += 1) {
    const isLastRound = round === AGENT_MAX_TOOL_ROUNDS;
    const response = await client.beta.messages.create({
      model,
      max_tokens: AGENT_MAX_TOKENS,
      system,
      tools: agentTools,
      // "none" keeps the tool list (and so the cache prefix) intact while
      // forbidding further calls
      tool_choice: isLastRound ? { type: "none" } : { type: "auto" },
      messages,
      output_config: { effort: AGENT_EFFORT },
      // Caches everything up to the last block, so each round re-reads the
      // previous rounds' tool results from cache instead of paying full price
      cache_control: { type: "ephemeral" },
      betas: [SERVER_FALLBACK_BETA],
      fallbacks: "default",
    });
    logRound(round, response);

    // Append the whole content - thinking, server tool blocks, fallback
    // markers - never just the text. The history must stay append-only.
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "refusal") {
      return { answer: REFUSAL_ANSWER, snippets, toolCalls, issuesFiled };
    }

    // A long-running server tool (web_search) paused; resending resumes it
    if (response.stop_reason === "pause_turn") continue;

    const toolUses = response.content.filter(
      (block): block is BetaToolUseBlock => block.type === "tool_use",
    );
    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      return {
        answer: extractText(response),
        snippets,
        toolCalls,
        issuesFiled,
      };
    }

    // Parallel calls run concurrently, and all their results go back in ONE
    // user message - splitting them teaches the model to stop parallelising
    const outcomes = await Promise.all(
      toolUses.map((block) => executeTool(block.name, block.input, tools)),
    );
    const results: BetaToolResultBlockParam[] = toolUses.map(
      (block, index) => ({
        type: "tool_result",
        tool_use_id: block.id,
        content: outcomes[index].content,
        is_error: outcomes[index].isError,
      }),
    );
    outcomes.forEach((outcome) => snippets.push(...outcome.snippets));
    toolCalls.push(...toolUses.map((block) => block.name));
    messages.push({ role: "user", content: results });
  }

  // Only reachable if the forced last round itself paused
  return { answer: "", snippets, toolCalls, issuesFiled };
};
