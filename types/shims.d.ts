declare module "fs" {
  const fs: any;
  export default fs;
  export = fs;
}

declare module "path" {
  const path: any;
  export default path;
  export = path;
}

declare module "dotenv" {
  const dotenv: {
    config: () => void;
  };
  export default dotenv;
}

declare module "@ai-chat/core" {
  export const AIServiceFactory: any;
  export const saveConversationToFile: any;
  export const formatConversation: any;
  export const loadConversationFromFile: any;
  export const AI_PROVIDERS: any;
  export const DEFAULT_MODELS: any;
  export const streamText: any;
  export const getRandomAIConfig: any;
  export const DEFAULT_CONVERSATION_CONFIG: any;
}

declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
  exit(code?: number): never;
  stdout: { write: (str: string) => void };
};

declare function setTimeout(
  handler: (...args: any[]) => void,
  timeout?: number,
  ...args: any[]
): number;

declare const console: {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
};
