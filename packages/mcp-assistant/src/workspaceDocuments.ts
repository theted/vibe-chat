import fs from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import fg from "fast-glob";

import {
  DEFAULT_ALLOWED_EXTENSIONS,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  IGNORED_PATHS,
  INDEX_FORMAT_VERSION,
} from "./constants.js";

type ChunkMetadata = {
  startLine: number;
  endLine: number;
};

type ContentChunk = {
  content: string;
  metadata: ChunkMetadata;
};

type ChunkOptions = {
  chunkSize?: number;
  chunkOverlap?: number;
};

type FileInfo = {
  componentName?: string;
  fileType?: string;
  isReactComponent?: boolean;
};

export type DocumentMetadata = ChunkMetadata &
  FileInfo & {
    relativePath: string;
  };

export type WorkspaceDocument = {
  content: string;
  metadata: DocumentMetadata;
};

export type WorkspaceScanOptions = ChunkOptions & {
  allowedExtensions?: Set<string>;
  /** Folded into the fingerprint: a different embedder needs a rebuild too */
  embedderId?: string;
};

type WorkspaceFile = {
  relativePath: string;
  content: string;
};

// Lone UTF-16 surrogates break JSON serialisation of the Chroma request;
// toWellFormed (Bun, Node 20+) swaps them for U+FFFD
const sanitizeText = (text: string): string =>
  (text as string & { toWellFormed: () => string }).toWellFormed();

const newlineIndicesFor = (text: string): number[] => {
  const indices: number[] = [-1];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") {
      indices.push(i);
    }
  }
  return indices;
};

const lineNumberAt = (indices: number[], position: number): number => {
  let low = 0;
  let high = indices.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (indices[mid] === position) {
      return mid + 1;
    }
    if (indices[mid] < position) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return low;
};

const chunkContent = (
  content: string,
  options: ChunkOptions = {},
): ContentChunk[] => {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
  } = options;
  const length = content.length;
  const newlineIdx = newlineIndicesFor(content);
  const chunks: ContentChunk[] = [];

  let start = 0;

  while (start < length) {
    let end = Math.min(start + chunkSize, length);

    if (end < length) {
      const nextNewline = content.indexOf("\n", end);
      if (nextNewline !== -1 && nextNewline - start <= chunkSize * 1.4) {
        end = nextNewline + 1;
      }
    }

    const raw = content.slice(start, end);
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      const startLine = lineNumberAt(newlineIdx, start + 1);
      const endLine = lineNumberAt(newlineIdx, end);
      chunks.push({
        content: trimmed,
        metadata: {
          startLine,
          endLine,
        },
      });
    }

    if (end >= length) break;
    start = Math.max(0, end - chunkOverlap);
  }

  return chunks;
};

const extractComponentInfo = (
  content: string,
  relativePath: string,
): FileInfo => {
  const info: FileInfo = {};

  // Extract component/function names from file
  const componentMatch = content.match(
    /(?:export\s+(?:default\s+)?(?:function|const)\s+(\w+)|const\s+(\w+)\s*=.*?(?:React\.)?(?:memo|forwardRef))/,
  );
  if (componentMatch) {
    const name = componentMatch[1] || componentMatch[2];
    info.componentName = sanitizeText(name);
  }

  // Extract file type
  const ext = path.extname(relativePath);
  info.fileType = sanitizeText(ext);

  // Detect if React component
  if (
    content.includes("import React") ||
    content.includes("from 'react'") ||
    content.includes('from "react"')
  ) {
    info.isReactComponent = true;
  }

  return info;
};

const readWorkspaceFiles = async (
  rootDir: string,
  allowedExtensions: Set<string>,
): Promise<WorkspaceFile[]> => {
  const patterns = Array.from(allowedExtensions).map((ext) => `**/*${ext}`);
  const filePaths = await fg(patterns, {
    cwd: rootDir,
    absolute: true,
    ignore: IGNORED_PATHS,
    dot: false,
    followSymbolicLinks: false,
  });
  // Sorted so the fingerprint doesn't depend on filesystem walk order
  filePaths.sort();

  const files: WorkspaceFile[] = [];
  for (const absolutePath of filePaths) {
    try {
      const rawContent = await fs.readFile(absolutePath, "utf8");
      files.push({
        relativePath: sanitizeText(path.relative(rootDir, absolutePath)),
        content: sanitizeText(rawContent),
      });
    } catch (error) {
      console.warn(
        `[MCP] Failed to read ${absolutePath}: ${(error as Error).message}`,
      );
    }
  }
  return files;
};

const fingerprintFiles = (
  files: WorkspaceFile[],
  options: WorkspaceScanOptions,
): string => {
  const hash = createHash("sha256");
  hash.update(
    JSON.stringify({
      formatVersion: INDEX_FORMAT_VERSION,
      embedderId: options.embedderId ?? null,
      chunkSize: options.chunkSize ?? DEFAULT_CHUNK_SIZE,
      chunkOverlap: options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP,
    }),
  );
  for (const file of files) {
    hash
      .update(file.relativePath)
      .update("\0")
      .update(file.content)
      .update("\0");
  }
  return hash.digest("hex");
};

const chunkFile = (
  file: WorkspaceFile,
  options: ChunkOptions,
): WorkspaceDocument[] => {
  const fileInfo = extractComponentInfo(file.content, file.relativePath);
  return chunkContent(file.content, options).map((chunk) => ({
    content: sanitizeText(chunk.content),
    metadata: {
      relativePath: file.relativePath,
      startLine: chunk.metadata.startLine,
      endLine: chunk.metadata.endLine,
      ...fileInfo,
    },
  }));
};

/** Hash of everything the index is built from; cheap enough to run at startup. */
export const computeWorkspaceFingerprint = async (
  rootDir: string,
  options: WorkspaceScanOptions = {},
): Promise<string> => {
  const files = await readWorkspaceFiles(
    rootDir,
    options.allowedExtensions ?? DEFAULT_ALLOWED_EXTENSIONS,
  );
  return fingerprintFiles(files, options);
};

export const buildWorkspaceDocuments = async (
  rootDir: string,
  options: WorkspaceScanOptions = {},
): Promise<{ documents: WorkspaceDocument[]; fingerprint: string }> => {
  const files = await readWorkspaceFiles(
    rootDir,
    options.allowedExtensions ?? DEFAULT_ALLOWED_EXTENSIONS,
  );
  return {
    documents: files.flatMap((file) => chunkFile(file, options)),
    fingerprint: fingerprintFiles(files, options),
  };
};
