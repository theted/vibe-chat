import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

import { buildWorkspaceDocuments } from "./workspaceDocuments";

const rootDir = mkdtempSync(path.join(tmpdir(), "workspace-docs-"));
writeFileSync(
  path.join(rootDir, "example.ts"),
  Array.from(
    { length: 200 },
    (_, line) => `export const value${line} = ${line};`,
  ).join("\n"),
);

afterAll(() => rmSync(rootDir, { recursive: true, force: true }));

describe("buildWorkspaceDocuments chunking", () => {
  test("splits a file into overlapping chunks with line ranges", async () => {
    const { documents } = await buildWorkspaceDocuments(rootDir, {
      chunkSize: 1000,
      chunkOverlap: 100,
    });
    expect(documents.length).toBeGreaterThan(1);
    expect(documents[0].metadata.startLine).toBe(1);
  });

  // An overlap that isn't smaller than the chunk would never advance
  test.each([
    [200, 300],
    [200, 200],
    [0, 0],
    [200, -1],
    [Number.NaN, 10],
  ])(
    "rejects chunk size %p with overlap %p",
    async (chunkSize, chunkOverlap) => {
      await expect(
        buildWorkspaceDocuments(rootDir, { chunkSize, chunkOverlap }),
      ).rejects.toThrow("Invalid chunking");
    },
  );
});
