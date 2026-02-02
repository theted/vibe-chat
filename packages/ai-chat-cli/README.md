# AI Chat CLI

Command-line interface for multi-AI conversations. Enables scripted/headless conversations between different AI models.

## Installation

From the root of the monorepo:

```bash
npm install
npm run build:cli
```

## Usage

### Multi-Model Conversations

Start conversations between two AI providers:

```bash
npm run cli [provider[:MODEL]] [provider[:MODEL]] [topic] [maxTurns]
```

**Examples:**

```bash
# Basic conversation
npm run cli openai anthropic "Discuss the future of AI"

# Specify models
npm run cli mistral:MISTRAL_SMALL grok:GROK_3_MINI openai:GPT4O "Be sarcastic about love"

# Set conversation length
npm run cli grok gemini "Nature of consciousness?" 8
```

### Single Prompt Mode

Get a single response from one or more providers:

```bash
npm run cli gemini grok "What is your favorite book?"
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
node dist/play.js <path-to-conversation.json>
```

**Example:**

```bash
node dist/play.js conversations/2025-09-10T17-44-19-366Z-we-re-stoned-bro-s.json
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
node dist/play-screensaver.js
```

**Controls:**
- Press **Enter** to skip to next conversation
- Press **Ctrl+C** to stop

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `SCREENSAVER_DELAY_MS` | `1500` | Delay between conversation replays |

## MCP Code Assistant

The CLI includes a built-in `@Chat` code assistant powered by RAG (Retrieval-Augmented Generation) using Chroma vector store.

### Setup

```bash
# Start Chroma (if using Docker)
docker compose -f docker-compose.dev.yml up chroma

# Index the codebase
node dist/scripts/index-mcp-chat.js --chroma-url http://localhost:8000

# Query the index
node dist/scripts/run-mcp-chat.js --question "How are messages styled?"
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CHROMA_URL` | `http://localhost:8000` | Chroma vector store URL |
| `CHAT_ASSISTANT_SCRIPT` | `./packages/ai-chat-cli/dist/scripts/run-mcp-chat.js` | Path to assistant script |
| `CHAT_ASSISTANT_AUTO_INDEX` | `false` | Auto-index on startup |
| `CHAT_ASSISTANT_COLLECTION` | `ai-chat-workspace` | Chroma collection name |

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
npm run build:cli
```

### Tests

```bash
npm run test:cli
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
