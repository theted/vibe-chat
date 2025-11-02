import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const resolveDefaultProjectRoot = () => {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(moduleDir, "..", "..");
};

/**
 * ChatMCPAssistant listens for @mentions and routes the question through the MCP generator script.
 */
export class ChatMCPAssistant {
  constructor(options = {}) {
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
            scriptPath || path.join("scripts", "run-mcp-chat.js")
          );
  }

  async initialise() {
    await fs.access(this.scriptPath);
  }

  shouldHandle(message) {
    return Boolean(message?.content && this.mentionRegex.test(message.content));
  }

  async handleMessage({ message }) {
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
    } catch (error) {
      return {
        role: "assistant",
        content: `@${this.name}: I could not retrieve code details right now (${error.message}).`,
        authorName: this.name,
      };
    }
  }

  #extractQuestion(content) {
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

  #generateAnswer(question) {
    return new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [this.scriptPath, "--question", question],
        {
          cwd: this.projectRoot,
          stdio: ["ignore", "pipe", "pipe"],
        }
      );

      let stdout = "";
      let stderr = "";
      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
      }, this.timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      child.on("close", (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve(stdout.trim());
          return;
        }
        reject(
          new Error(
            stderr.trim() || `generator exited with status code ${code}`
          )
        );
      });
    });
  }
}
