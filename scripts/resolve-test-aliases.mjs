import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [packageDirArg] = process.argv.slice(2);

if (!packageDirArg) {
  throw new Error("Usage: bun scripts/resolve-test-aliases.mjs <package-dir>");
}

const packageDir = path.resolve(process.cwd(), packageDirArg);
const tsconfigPath = path.join(packageDir, "tsconfig.tests.json");

const tsconfig = JSON.parse(await readFile(tsconfigPath, "utf8"));
const outDir = tsconfig.compilerOptions?.outDir;

if (!outDir) {
  throw new Error(`Missing compilerOptions.outDir in ${tsconfigPath}`);
}

const outDirPath = path.resolve(packageDir, outDir);
const aliasPattern = /(["'])@\/([^"']+)\1/g;

const rewriteFile = async (filePath) => {
  const contents = await readFile(filePath, "utf8");
  if (!contents.includes("@/")) {
    return;
  }

  // For test files, resolve @/ aliases relative to the main dist directory
  // since tests import from the compiled source
  const distDirPath = path.resolve(packageDir, "dist");

  const updated = contents.replace(aliasPattern, (_match, quote, aliasPath) => {
    const targetPath = path.join(distDirPath, aliasPath);
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
};

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        return;
      }
      if (/\.(js|d\.ts|map)$/.test(entry.name)) {
        await rewriteFile(fullPath);
      }
    }),
  );
};

await walk(outDirPath);
