import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultClientBuildDir = path.resolve(__dirname, "../../../client/dist");

export const allowedOrigins = "*";
export const port = Number(process.env.PORT || 3001);
export const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
export const clientBuildDir = process.env.CLIENT_BUILD_DIR
  ? path.resolve(process.env.CLIENT_BUILD_DIR)
  : defaultClientBuildDir;

// Rate limiting configuration
export const USER_MESSAGE_LIMIT = 10;
export const USER_MESSAGE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// Validation limits
export const USERNAME_MAX_LENGTH = 50;
export const MESSAGE_MAX_LENGTH = 1000;
export const TOPIC_MAX_LENGTH = 100;

// @Chat assistant: each answer is a multi-round agent run (and a web search
// alone pulls ~20k tokens), and the AIs are prompted to ask @Chat, so their
// questions are throttled per room. Human questions are not.
export const CHAT_ASSISTANT_AI_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes
// One answer per room at a time; a person asking meanwhile hears why it's
// ignored (AI askers are skipped silently, like the cooldown)
export const CHAT_ASSISTANT_BUSY_NOTICE =
  "I'm still answering another question here. Ask me again in a moment.";
