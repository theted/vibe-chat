import { watch } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [packageDirArg] = process.argv.slice(2);

if (!packageDirArg) {
  throw new Error("Usage: node scripts/watch-resolve-aliases.mjs <package-dir>");
}

const packageDir = path.resolve(process.cwd(), packageDirArg);
const tsconfigPath = path.join(packageDir, "tsconfig.json");

const tsconfig = JSON.parse(await readFile(tsconfigPath, "utf8"));
const outDir = tsconfig.compilerOptions?.outDir;

if (!outDir) {
  throw new Error(`Missing compilerOptions.outDir in ${tsconfigPath}`);
}

const outDirPath = path.resolve(packageDir, outDir);
const aliasPattern = /(["'])@\/([^"']+)\1/g;

const rewriteFile = async (filePath) => {
  try {
    const contents = await readFile(filePath, "utf8");
    if (!contents.includes("@/")) {
      return;
    }

    const updated = contents.replace(aliasPattern, (_match, quote, aliasPath) => {
      const targetPath = path.join(outDirPath, aliasPath);
      let relativePath = path.relative(path.dirname(filePath), targetPath);
      if (!relativePath.startsWith(".")) {
        relativePath = `./${relativePath}`;
      }
      const normalized = relativePath.split(path.sep).join(path.posix.sep);
      return `${quote}${normalized}${quote}`;
    });

    if (updated !== contents) {
      await writeFile(filePath, updated, "utf8");
    }
  } catch {
    // File may have been deleted or is being written
  }
};

const DEBOUNCE_MS = 100;
let pending = new Map();

const scheduleRewrite = (filePath) => {
  if (pending.has(filePath)) {
    clearTimeout(pending.get(filePath));
  }
  pending.set(
    filePath,
    setTimeout(() => {
      pending.delete(filePath);
      rewriteFile(filePath);
    }, DEBOUNCE_MS)
  );
};

console.log(`[watch-resolve-aliases] Watching ${outDirPath}`);

watch(outDirPath, { recursive: true }, (eventType, filename) => {
  if (!filename || !/\.(js|d\.ts)$/.test(filename)) {
    return;
  }
  const fullPath = path.join(outDirPath, filename);
  scheduleRewrite(fullPath);
});
