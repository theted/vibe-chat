/**
 * Conversation Screensaver
 *
 * Continuously plays random conversation files using play.js.
 * Usage:
 *   bun dist/play-screensaver.js
 *
 * Env overrides:
 *   SCREENSAVER_DELAY_MS   delay between replays (default: 1500)
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const CONVERSATIONS_DIR = path.resolve(process.cwd(), "conversations");
const PLAY_SCRIPT = path.resolve(process.cwd(), "dist", "play.js");
const DELAY_MS = Number(process.env.SCREENSAVER_DELAY_MS || 1500);

const sleep = (ms: number): Promise<void> =>
  new Promise((res) => setTimeout(res, ms));

const listConversationFiles = (): string[] => {
  if (!fs.existsSync(CONVERSATIONS_DIR)) return [];
  return fs
    .readdirSync(CONVERSATIONS_DIR)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .map((f) => path.join(CONVERSATIONS_DIR, f));
};

const pickRandom = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

let currentChild: ReturnType<typeof spawn> | null = null;
let skipRequested = false;

const playFile = (filePath: string): Promise<void> =>
  new Promise((resolve) => {
    currentChild = spawn("bun", [PLAY_SCRIPT, filePath], { stdio: "inherit" });
    currentChild.on("exit", () => {
      currentChild = null;
      resolve();
    });
    currentChild.on("error", () => {
      currentChild = null;
      resolve();
    });
  });

const main = async (): Promise<void> => {
  console.log("Screensaver starting. Press Enter to skip, Ctrl+C to stop.\n");
  if (!fs.existsSync(PLAY_SCRIPT)) {
    console.error(`Missing ${PLAY_SCRIPT}. Run "bun run build" first.`);
    process.exit(1);
  }

  // Setup key handler for Enter to skip current playback
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", (buf: Buffer) => {
      const s = buf.toString("utf8");
      // Enter can be \r or \n depending on terminal
      if (s === "\r" || s === "\n") {
        skipRequested = true;
        if (currentChild && !currentChild.killed) {
          // Politely terminate; fallback to force kill if needed
          currentChild.kill();
          setTimeout(() => {
            if (currentChild && !currentChild.killed)
              currentChild.kill("SIGKILL");
          }, 500);
        }
      }
      // Allow Ctrl+C to bubble to SIGINT handler
    });
  }
  while (true) {
    const files = listConversationFiles();
    if (files.length === 0) {
      console.log(
        `No conversations found in ${CONVERSATIONS_DIR}. Waiting for files...`,
      );
      await sleep(Math.max(DELAY_MS, 1500));
      continue;
    }

    const file = pickRandom(files);
    console.log(`\nSelected: ${path.basename(file)}\n`);
    await playFile(file);
    if (skipRequested) {
      skipRequested = false; // immediately continue to next playback
      continue;
    }
    await sleep(DELAY_MS);
  }
};

process.on("SIGINT", () => {
  console.log("\nScreensaver stopped.");
  if (process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(false);
    } catch {}
    process.stdin.pause();
  }
  process.exit(0);
});

main().catch((err) => {
  console.error(`Screensaver error: ${err.message}`);
  process.exit(1);
});
