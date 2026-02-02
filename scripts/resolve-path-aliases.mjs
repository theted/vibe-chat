import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [packageDirArg, tsconfigFileArg] = process.argv.slice(2);

if (!packageDirArg) {
  throw new Error("Usage: node scripts/resolve-path-aliases.mjs <package-dir>");
}

const packageDir = path.resolve(process.cwd(), packageDirArg);
const tsconfigPath = path.join(packageDir, tsconfigFileArg || "tsconfig.json");

const tsconfig = JSON.parse(await readFile(tsconfigPath, "utf8"));
const outDir = tsconfig.compilerOptions?.outDir;

if (!outDir) {
  throw new Error(`Missing compilerOptions.outDir in ${tsconfigPath}`);
}

const outDirPath = path.resolve(packageDir, outDir);
const aliasPattern = /(["'])@\/([^"']+)\1/g;

// Read path mappings and rootDir from tsconfig
const paths = tsconfig.compilerOptions?.paths || {};
const aliasMapping = paths["@/*"]?.[0] || "@/*";
const aliasPrefix = aliasMapping.replace("/*", "");
const rootDir = tsconfig.compilerOptions?.rootDir || ".";
const rootDirNormalized = rootDir.replace(/^\.\//, "");

const rewriteFile = async (filePath) => {
  const contents = await readFile(filePath, "utf8");
  if (!contents.includes("@/")) {
    return;
  }

  const updated = contents.replace(aliasPattern, (_match, quote, aliasPath) => {
    // Apply the path mapping from tsconfig (e.g., @/* -> src/*)
    // But if rootDir matches the aliasPrefix, TypeScript already stripped it during compilation
    let mappedPath;
    if (aliasPrefix !== "@" && rootDirNormalized !== aliasPrefix) {
      // rootDir is different from alias prefix, so we need to add the prefix
      mappedPath = path.join(aliasPrefix, aliasPath);
    } else {
      // rootDir matches alias prefix, TypeScript already handled the mapping
      mappedPath = aliasPath;
    }
    const targetPath = path.join(outDirPath, mappedPath);
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
