import fs from "fs/promises";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import { fileURLToPath } from "url";

const resolveDefaultProjectRoot = (): string => {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(moduleDir, "..", "..");
};

interface ChatMCPAssistantOptions {
  mentionName?: string;
  projectRoot?: string;
  scriptPath?: string;
  timeoutMs?: number;
}

interface Message {
  content?: string;
}

interface HandleMessageParams {
  message?: Message;
}

interface AssistantResponse {
  role: string;
  content: string;
  authorName: string;
}

/**
 * ChatMCPAssistant listens for @mentions and routes the question through the MCP generator script.
 */
export class ChatMCPAssistant {
  public readonly name: string;
  private readonly projectRoot: string;
  private readonly timeoutMs: number;
  private readonly mentionRegex: RegExp;
  private readonly scriptPath: string;

  constructor(options: ChatMCPAssistantOptions = {}) {
    const {
      mentionName = "Chat",
      projectRoot = resolveDefaultProjectRoot(),
      scriptPath,
      timeoutMs = 15_000,
    } = options;

    this.name = mentionName;
    this.projectRoot = path.resolve(projectRoot);
    this.timeoutMs = timeoutMs;
    this.mentionRegex = new RegExp(`@${this.name}\\b`, "i");
    this.scriptPath =
      scriptPath && path.isAbsolute(scriptPath)
        ? scriptPath
        : path.resolve(
            this.projectRoot,
            scriptPath || path.join("dist", "scripts", "run-mcp-chat.js"),
          );
  }

  async initialise(): Promise<void> {
    await fs.access(this.scriptPath);
  }

  shouldHandle(message?: Message): boolean {
    return Boolean(message?.content && this.mentionRegex.test(message.content));
  }

  async handleMessage({
    message,
  }: HandleMessageParams): Promise<AssistantResponse | null> {
    const question = this.#extractQuestion(message?.content);
    if (!question) {
      return null;
    }

    try {
      const answer = await this.#generateAnswer(question);
      if (!answer) {
        return null;
      }

      return {
        role: "assistant",
        content: answer,
        authorName: this.name,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        role: "assistant",
        content: `@${this.name}: I could not retrieve code details right now (${errorMessage}).`,
        authorName: this.name,
      };
    }
  }

  #extractQuestion(content?: string): string | null {
    if (!content) {
      return null;
    }

    const match = this.mentionRegex.exec(content);
    if (!match) {
      return null;
    }

    const afterMention = content.slice(match.index + match[0].length);
    const cleaned = afterMention.replace(/^[\s,:-]+/, "").trim();
    return cleaned || null;
  }

  #generateAnswer(question: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child: ChildProcess = spawn(
        process.execPath,
        [this.scriptPath, "--question", question],
        {
          cwd: this.projectRoot,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

      let stdout = "";
      let stderr = "";
      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
      }, this.timeoutMs);

      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on("error", (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });

      child.on("close", (code: number | null) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve(stdout.trim());
          return;
        }
        reject(
          new Error(
            stderr.trim() || `generator exited with status code ${code}`,
          ),
        );
      });
    });
  }
}
