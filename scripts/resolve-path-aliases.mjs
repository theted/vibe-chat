import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [packageDirArg, tsconfigArg] = process.argv.slice(2);

if (!packageDirArg) {
  throw new Error(
    "Usage: node scripts/resolve-path-aliases.mjs <package-dir> [tsconfig-file]",
  );
}

const packageDir = path.resolve(process.cwd(), packageDirArg);
const tsconfigPath = path.join(packageDir, tsconfigArg || "tsconfig.json");

// Load tsconfig with support for "extends"
const loadTsConfig = async (configPath) => {
  const config = JSON.parse(await readFile(configPath, "utf8"));
  if (config.extends) {
    const basePath = path.resolve(path.dirname(configPath), config.extends);
    const baseConfig = await loadTsConfig(basePath);
    return {
      ...baseConfig,
      ...config,
      compilerOptions: {
        ...baseConfig.compilerOptions,
        ...config.compilerOptions,
      },
    };
  }
  return config;
};

const tsconfig = await loadTsConfig(tsconfigPath);
const outDir = tsconfig.compilerOptions?.outDir;
const rootDir = tsconfig.compilerOptions?.rootDir || ".";
const paths = tsconfig.compilerOptions?.paths || {};

if (!outDir) {
  throw new Error(`Missing compilerOptions.outDir in ${tsconfigPath}`);
}

// Extract the source directory from paths config (e.g., "@/*": ["src/*"] -> "src")
const aliasMapping = paths["@/*"];
const aliasTarget = aliasMapping?.[0]?.replace("/*", "") || "";

// Compute how aliasTarget appears in output relative to rootDir
// e.g., rootDir="./src", aliasTarget="src" -> "" (stripped)
// e.g., rootDir=".", aliasTarget="src" -> "src" (preserved)
const normalizedRootDir = path.normalize(rootDir);
const normalizedAliasTarget = path.normalize(aliasTarget);
const outputAliasDir = path.relative(normalizedRootDir, normalizedAliasTarget);

const outDirPath = path.resolve(packageDir, outDir);
const aliasPattern = /(["'])@\/([^"']+)\1/g;

const rewriteFile = async (filePath) => {
  const contents = await readFile(filePath, "utf8");
  if (!contents.includes("@/")) {
    return;
  }

  const updated = contents.replace(aliasPattern, (_match, quote, aliasPath) => {
    // Compute target path accounting for rootDir stripping
    const targetPath = path.join(outDirPath, outputAliasDir, aliasPath);
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
