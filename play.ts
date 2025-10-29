/**
 * Conversation Playback (Terminal)
 *
 * Usage:
 *   node play.js conversations/2025-09-10T17-44-19-366Z-we-re-stoned-bro-s.json
 *
 * Plays a saved conversation JSON as a live chat with typing animation.
 * - Small delay between keystrokes (typing simulation)
 * - Small delay between messages
 * - Each speaker has a distinct color; only the bracketed name is colored
 */

import fs from "fs";
import path from "path";

interface PlaybackMessage {
  from: string;
  content: string;
}

interface PlaybackFile {
  topic?: string;
  messages: PlaybackMessage[];
}

// Typing and pacing configuration
const TYPING_DELAY_MS = Number(process.env.PLAY_TYPING_DELAY_MS || 8); // per char
const BETWEEN_MESSAGES_MS = Number(process.env.PLAY_BETWEEN_MESSAGES_MS || 500);

// ANSI color helpers
const ANSI = {
  reset: "\x1b[0m",
  colors: [
    "\x1b[36m", // cyan
    "\x1b[35m", // magenta
    "\x1b[34m", // blue
    "\x1b[32m", // green
    "\x1b[33m", // yellow
    "\x1b[31m", // red
    "\x1b[96m", // bright cyan
    "\x1b[95m", // bright magenta
    "\x1b[94m", // bright blue
    "\x1b[92m", // bright green
    "\x1b[93m", // bright yellow
    "\x1b[91m", // bright red
  ],
} as const;

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function colorForName(name: string): string {
  const idx = hashString(name) % ANSI.colors.length;
  return ANSI.colors[idx];
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

async function typeOut(text: string): Promise<void> {
  for (let i = 0; i < text.length; i++) {
    process.stdout.write(text[i]);
    await sleep(TYPING_DELAY_MS);
  }
}

function fmtHeader(name: string, color: string): string {
  // Only the bracketed name is colored
  return `${color}[${name}]${ANSI.reset} `;
}

async function playConversation(filePath: string): Promise<void> {
  // Load file
  const data = JSON.parse(fs.readFileSync(filePath, "utf8")) as ConversationFile;
  const { topic, messages } = data;

  // Print header
  const title = path.basename(filePath);
  console.log(`\nPlaying conversation: ${title}`);
  if (topic) console.log(`Topic: ${topic}`);
  console.log("");

  // Build color map per speaker
  const uniqueNames: string[] = [];
  for (const m of messages) if (!uniqueNames.includes(m.from)) uniqueNames.push(m.from);
  const nameColors = new Map(uniqueNames.map((n) => [n, colorForName(n)]));

  // Stream messages
  for (const m of messages) {
    const color = nameColors.get(m.from) || ANSI.colors[0];
    const header = fmtHeader(m.from, color);
    process.stdout.write(header);
    await typeOut(m.content || "");
    process.stdout.write("\n");
    await sleep(BETWEEN_MESSAGES_MS);
  }

  console.log("\nPlayback finished.\n");
}

async function main(): Promise<void> {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("Usage: node play.js <path-to-conversation.json>");
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  try {
    await playConversation(resolved);
  } catch (err) {
    console.error(`Playback error: ${err.message}`);
    process.exit(1);
  }
}

main();

