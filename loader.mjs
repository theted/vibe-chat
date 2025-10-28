import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const projectRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)));
const srcRoot = path.join(projectRoot, "src");

export function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith("@/")) {
    const absolutePath = pathToFileURL(path.join(srcRoot, specifier.slice(2))).href;
    return defaultResolve(absolutePath, context, defaultResolve);
  }

  return defaultResolve(specifier, context, defaultResolve);
}
