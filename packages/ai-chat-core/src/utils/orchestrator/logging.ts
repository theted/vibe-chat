import type { ContextMessage } from "@/types/orchestrator.js";
import type { OrchestratorAIService } from "@/utils/orchestrator/aiLookup.js";

export const logAIContext = (
  aiService: OrchestratorAIService,
  messages: ContextMessage[],
  verboseContextLogging: boolean,
) => {
  if (!verboseContextLogging || !Array.isArray(messages)) {
    return;
  }

  const provider = aiService.config?.providerKey || "unknown";
  const model =
    aiService.config?.modelKey || aiService.service?.getModel?.() || "unknown";
  console.log(
    `📝 [Verbose] Prompt for ${aiService.name} (${provider}:${model})`,
  );

  messages.forEach((message, index) => {
    const parts = [];
    if (message.role) parts.push(message.role);
    if (message.sender) parts.push(message.sender);
    const label = parts.length ? parts.join(" · ") : `message-${index + 1}`;
    const contentValue =
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content, null, 2);
    const lines = contentValue ? contentValue.split("\n") : ["<empty>"];
    console.log(`   ${index + 1}. ${label}`);
    lines.forEach((line) => {
      if (line.length === 0) {
        console.log("      ");
      } else {
        console.log(`      ${line}`);
      }
    });
  });

  console.log("📝 [Verbose] End prompt\n");
};
