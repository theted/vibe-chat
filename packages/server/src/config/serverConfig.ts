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
