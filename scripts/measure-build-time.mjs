import { readdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { performance } from "node:perf_hooks";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const packagesDir = path.join(rootDir, "packages");

const runCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed: ${command} ${args.join(" ")}`));
    });
  });

const formatSeconds = (value) => `${value.toFixed(2)}s`;

const entries = await readdir(packagesDir, { withFileTypes: true });
const results = [];
const totalStart = performance.now();

for (const entry of entries) {
  if (!entry.isDirectory()) {
    continue;
  }

  const packageJsonPath = path.join(packagesDir, entry.name, "package.json");
  let packageJson;

  try {
    packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
  } catch {
    continue;
  }

  if (!packageJson.scripts?.build || !packageJson.name) {
    continue;
  }

  const start = performance.now();
  console.info(`\nBuilding ${packageJson.name}...`);
  await runCommand("npm", ["--workspace", packageJson.name, "run", "build"], {
    cwd: rootDir,
  });
  const duration = (performance.now() - start) / 1000;
  results.push({ name: packageJson.name, duration });
}

const totalDuration = (performance.now() - totalStart) / 1000;

console.info("\nBuild time summary:");
for (const result of results) {
  console.info(`${result.name}: ${formatSeconds(result.duration)}`);
}
console.info(`Total: ${formatSeconds(totalDuration)}`);
