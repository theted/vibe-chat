# AI Chat CLI

Command-line interface for multi-AI conversations. Enables scripted/headless conversations between different AI models.

## Installation

From the root of the monorepo:

```bash
pnpm install
pnpm run build:cli
```

## Usage

### Multi-Model Conversations

Start conversations between two AI providers:

```bash
pnpm run cli [provider[:MODEL]] [provider[:MODEL]] [topic] [maxTurns]
```

**Examples:**

```bash
# Basic conversation
pnpm run cli openai anthropic "Discuss the future of AI"

# Specify models
pnpm run cli mistral:MISTRAL_SMALL grok:GROK_3_MINI openai:GPT4O "Be sarcastic about love"

# Set conversation length
pnpm run cli grok gemini "Nature of consciousness?" 8
```

### Single Prompt Mode

Get a single response from one or more providers:

```bash
pnpm run cli gemini grok "What is your favorite book?"
```

### Provider Aliases

| Alias | Resolves To |
|-------|-------------|
| `gemeni` (typo) | `gemini` |
| `google` | `gemini` |
| `moonshot` | `kimi` |
| `z`, `z.ai` | `zai` |

## Playback Tools

### Conversation Playback (`play.ts`)

Plays a saved conversation JSON file as a live chat with typing animation in the terminal.

```bash
bun dist/play.js <path-to-conversation.json>
```

**Example:**

```bash
bun dist/play.js conversations/2025-09-10T17-44-19-366Z-we-re-stoned-bro-s.json
```

**Features:**
- Typing simulation with configurable delays
- Distinct colors for each speaker
- Smooth playback of saved conversations

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `PLAY_TYPING_DELAY_MS` | `8` | Delay per character (typing speed) |
| `PLAY_BETWEEN_MESSAGES_MS` | `500` | Delay between messages |

### Screensaver Mode (`play-screensaver.ts`)

Continuously plays random conversation files from the `conversations/` directory.

```bash
bun dist/play-screensaver.js
```

**Controls:**
- Press **Enter** to skip to next conversation
- Press **Ctrl+C** to stop

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `SCREENSAVER_DELAY_MS` | `1500` | Delay between conversation replays |

## @Chat Assistant

`@Chat` is a Claude agent (`packages/mcp-assistant`) with three tools: semantic search over this repo's Chroma index, Anthropic's web search, and a `browse` tool that fetches public pages.

### Setup

```bash
# Start Chroma
docker run -d -p 127.0.0.1:8000:8000 chromadb/chroma:1.5.9

# Index the codebase (from the repo root)
bun run chat:index

# Ask a question
bun run chat:ask "How are messages styled?"
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | – | Runs the agent |
| `CHAT_ASSISTANT_MODEL` | `claude-opus-5-5` | Claude model for the agent |
| `CHAT_ASSISTANT_EMBEDDINGS` | `mistral` | Embeddings provider: `mistral`, `openai`, `gemini` or `cohere` (needs that provider's API key) |
| `CHROMA_URL` | `http://localhost:8000` | Chroma vector store URL |
| `CHAT_ASSISTANT_AUTO_INDEX` | `false` | Server rebuilds a missing or stale index on startup |
| `CHAT_ASSISTANT_COLLECTION` | `ai-chat-workspace` | Chroma collection name |

### Search the index from Claude Code (MCP)

The same index is exposed as a stdio MCP server with one tool, `search_codebase`. The repo's `.mcp.json` registers it as `vibe-chat`, so Claude Code offers it once you approve the project server on first start. It needs Chroma running, a built index and the embeddings key in `.env`. Results start with a note when the index is older than the files on disk; `bun run chat:index` refreshes it.

```bash
# Run it by hand, e.g. under the MCP Inspector
npx @modelcontextprotocol/inspector bun run chat:mcp
```

## Supported Providers

The CLI supports all providers configured in `@ai-chat/core`. See the main project README for the full list of supported providers and models.

### Required API Keys

Set these in your `.env` file (only needed for providers you use):

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_AI_API_KEY` (Gemini)
- `MISTRAL_API_KEY`
- `DEEPSEEK_API_KEY`
- `GROK_API_KEY`
- `COHERE_API_KEY`
- `QWEN_API_KEY`
- `KIMI_API_KEY`
- `LLAMA_API_KEY`
- `Z_API_KEY`
- `TOGETHER_API_KEY`
- `OPENROUTER_API_KEY` (Amazon, NVIDIA, Xiaomi, MiniMax, Baidu, ByteDance, Hugging Face)

## Development

### Build

```bash
pnpm run build:cli
```

### Tests

```bash
pnpm run test:cli
```

### Project Structure

```
ai-chat-cli/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── play.ts                  # Conversation playback
│   ├── play-screensaver.ts      # Screensaver mode
│   ├── config/                  # CLI configuration
│   ├── conversation/            # Conversation management
│   ├── handlers/                # Command handlers
│   ├── services/                # MCP assistant service
│   ├── types/                   # TypeScript types
│   └── utils/                   # Argument parsing, utilities
├── scripts/                     # MCP indexing/query scripts
└── tests/                       # Unit and integration tests
```
