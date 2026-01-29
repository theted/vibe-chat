# Vibe Chat

A Node.js project that lets different AI systems talk to each other, and also query single models directly.

## Overview

This project creates a platform where different AI models (OpenAI, Anthropic, Mistral, Gemini, DeepSeek, Grok, Cohere, Kimi, Z.ai, plus Qwen/Llama/Perplexity once configured) can engage in conversations with each other or respond to a single prompt. The system manages the conversation flow, handles API interactions, and logs the conversation history.

In addition to the Node.js CLI/orchestrator that powers model-to-model conversations, this repository now also ships with a full **`ai-realtime-chat`** implementation (located in [`./ai-chat-realtime`](./ai-chat-realtime)) that provides a Socket.IO-powered multi-AI web experience with a React frontend. You can choose whichever entry point best fits your use case.

## Features

- Support for multiple AI providers (OpenAI, Anthropic, Mistral, Gemini, DeepSeek, Grok, Cohere, Kimi, Z.ai, plus Qwen/Llama/Perplexity once configured)
- Extensible architecture for adding new AI providers
- Automatic conversation management
- Conversation logging and history
- Configurable conversation parameters
- Built-in `@Chat` code assistant powered by RAG that any participant can mention for implementation details
- Real-time Socket.IO chat implementation with AI personas (see [`ai-chat-realtime`](./ai-chat-realtime))

## Project Variants

| Variant | Folder | Description |
| --- | --- | --- |
| Orchestrated CLI / headless conversations | `./` | Original Vibe Chat runtime that lets you script or trigger conversations between providers from the command line. |
| `ai-realtime-chat` web experience | `./ai-chat-realtime` | A React + Socket.IO front end with an Express backend that keeps multiple AI personas chatting in real time with human participants. |

Each implementation can be used independently. The CLI tools remain the quickest path for experiments and automated conversations, while the real-time app provides an end-to-end user interface for running the experience in a browser.

## Project Structure

```
vibe-chat/
├── .env.example          # Example environment variables
├── .gitignore            # Git ignore file
├── index.js              # Main entry point
├── package.json          # Project configuration
├── README.md             # Project documentation
├── ai-chat-realtime/     # "ai-realtime-chat" web implementation (React + Socket.IO)
├── conversations/        # Saved conversation logs
└── src/
    ├── config/           # Configuration files
    │   └── aiProviders.js # AI provider + model configurations
    ├── conversation/     # Conversation management
    │   └── ConversationManager.js # Manages AI conversations
    ├── services/         # AI service implementations
    │   ├── AIServiceFactory.js    # Factory for creating AI services
    │   ├── AnthropicService.js    # Anthropic API service
    │   ├── BaseAIService.js       # Base class for AI services
    │   ├── DeepseekService.js     # Deepseek API service
    │   ├── GeminiService.js       # Google Gemini API service
    │   ├── GrokService.js         # Grok AI API service
    │   ├── CohereService.js       # Cohere REST chat service
    │   ├── MistralService.js      # Mistral AI API service
    │   ├── OpenAIService.js       # OpenAI API service
    │   ├── QwenService.js         # Qwen (DashScope/OpenAI-compatible) service
    │   ├── KimiService.js         # Kimi (Moonshot/OpenAI-compatible) service
    │   └── ZaiService.js          # Z.ai (OpenAI-compatible) service
    └── utils/            # Utility functions
        ├── logger.js     # Logging utilities
        └── streamText.js # Console streaming helper
└── tests/                # Integration tests (OK-check per provider)
    ├── integration-ok-*.js
    └── ...
```

## Prerequisites

- Node.js (v18 or higher)
- API keys for the AI providers you want to use

## Setup

1. Clone the repository:

   ```
   git clone https://github.com/theted/vibe-chat.git
   cd vibe-chat
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example` and add your API keys:
   ```
   cp .env.example .env
   # Edit .env and add your API keys
   ```

## Usage

There are two modes for the Node.js orchestrator: multi-model conversation and single-prompt responses. For the browser-based experience, see [`ai-chat-realtime`](./ai-chat-realtime) for dedicated setup instructions.

### MCP code lookups

The internal `@Chat` assistant and the real-time app both rely on the MCP generator script backed by a Chroma vector store. Before indexing, ensure a Chroma instance is reachable (the docker-compose files in `ai-chat-realtime/` expose one named `chroma`):

```bash
docker compose -f ai-chat-realtime/docker-compose.dev.yml up chroma   # optional helper, runs Chroma only
node scripts/index-mcp-chat.js --chroma-url http://localhost:8000     # builds or refreshes the embeddings
node scripts/run-mcp-chat.js --question "How are messages styled?"
```

`index-mcp-chat` accepts `--collection`, `--chunk-size`, `--chunk-overlap`, `--project-root`, and `--no-delete` (preserves existing vectors—useful in CI when multiple jobs share the database). It walks the repository (excluding `.git`, `node_modules`, `.env`, build artefacts, etc.) and writes the chunks into Chroma. The runner script streams an answer using the same collection.

If you run the realtime server from a different working directory (e.g., inside Docker), set either `CHAT_ASSISTANT_ROOT=/path/to/repo` or `CHAT_ASSISTANT_SCRIPT=/path/to/repo/scripts/run-mcp-chat.js` so the server can locate the generator.

In the realtime Docker Compose setups we already mount the scripts plus `packages/mcp-assistant`, start a Chroma vector-store container, and export `CHAT_ASSISTANT_SCRIPT=/app/scripts/run-mcp-chat.js`, `CHAT_ASSISTANT_AUTO_INDEX=true`, `NODE_PATH=/app/server/node_modules`, and `CHROMA_URL=http://chroma:8000`, so no additional configuration is required there. Run `node scripts/index-mcp-chat.js` whenever you want to refresh the collection; @Chat will pick up the new embeddings immediately.

### Syntax

- Command formats:

  - `npm start [provider[:MODEL]] [provider[:MODEL]] [topic] [maxTurns]`
  - `npm start [provider[:MODEL]] ... [providerN[:MODEL]] [prompt] [maxTurns]`

- Provider aliases:
  - `gemeni` (typo) and `google` resolve to `gemini`
  - `moonshot` resolves to `kimi`
  - `z` and `z.ai` resolve to `zai`

### Examples

- Two-model conversation (default models):
  - `npm start openai anthropic "Discuss the future of AI"`
- Custom models + multi-party conversation:
  - `npm start mistral:MISTRAL_SMALL grok:GROK_3_MINI openai:GPT4O "Be sarcastic about love"`
- Gemini + Grok single-prompt responses:
  - `npm start gemeni grok "What is your favorite book?"`
- Set max turns:
  - `npm start grok gemini "Nature of consciousness?" 8`

## Supported Providers and Models

Current defaults and IDs (see `ai-chat-realtime/packages/ai-chat-core/src/config/aiProviders/providers`):

- OpenAI ([API keys](https://platform.openai.com/api-keys))
  - `GPT4O` → `gpt-4o`
  - `GPT4_1` → `gpt-4.1` (specialized for coding)
  - `GPT5` → `gpt-5` (most advanced with multimodal)
  - `GPT5_1` → `gpt-5.1`
  - `GPT5_1_MINI` → `gpt-5.1-mini`
  - `GPT5_2` → `gpt-5.2`
  - `O3` → `o3-2025-04-16` (intelligent reasoning model)
  - `O3_MINI` → `o3-mini` (cost-efficient reasoning)
  - `O4_MINI` → `o4-mini` (fast reasoning for math/coding)
  - `GPT35_TURBO` → `gpt-3.5-turbo`
- Anthropic ([API keys](https://console.anthropic.com/settings/keys))
  - `CLAUDE3_7_SONNET` → `claude-3-7-sonnet-20250219` (hybrid reasoning)
  - `CLAUDE3_5_HAIKU_20241022` → `claude-3-5-haiku-20241022`
  - `CLAUDE_HAIKU_4_5` → `claude-haiku-4-5`
  - `CLAUDE_SONNET_4` → `claude-sonnet-4-20250514`
  - `CLAUDE_SONNET_4_5` (default) → `claude-sonnet-4-5` (best coding model)
  - `CLAUDE_OPUS_4_5` → `claude-opus-4-5`
  - `CLAUDE_OPUS_4` → `claude-opus-4-20250514`
  - `CLAUDE_OPUS_4_1` → `claude-opus-4-1` (industry leader for coding/agents)
- Mistral ([API keys](https://console.mistral.ai/api-keys))
  - `MISTRAL_LARGE` → `mistral-large-latest`
  - `MISTRAL_MEDIUM` → `mistral-medium-latest`
  - `MISTRAL_SMALL` → `mistral-small-latest`
  - `MAGISTRAL_SMALL` → `magistral-small-2506`
  - `MAGISTRAL_MEDIUM` → `magistral-medium-2506`
  - `CODESTRAL` → `codestral-latest`
  - `MINISTRAL_8B` → `ministral-8b-latest`
- Gemini ([API keys](https://aistudio.google.com/app/apikey))
  - `GEMINI_PRO` → `gemini-2.0-flash-exp`
  - `GEMINI_FLASH` → `gemini-2.0-flash`
  - `GEMINI_25` (default) → `gemini-2.5-pro`
  - `GEMINI_3` → `gemini-3.0-pro`
- DeepSeek ([API keys](https://platform.deepseek.com/api_keys))
  - `DEEPSEEK_CHAT` → `deepseek-chat`
  - `DEEPSEEK_V3` → `deepseek-v3`
  - `DEEPSEEK_V3_2` → `deepseek-v3.2`
  - `DEEPSEEK_R1` → `deepseek-reasoner`
- Grok ([API keys](https://console.x.ai/keys))
  - `GROK_3` (default) → `grok-3`
  - `GROK_3_MINI` → `grok-3-mini`
  - `GROK_4_0709` → `grok-4-0709`
  - `GROK_4_FAST_NON_REASONING` → `grok-4-fast-non-reasoning` (2M context)
  - `GROK_4_FAST_REASONING` → `grok-4-fast-reasoning` (2M context)
  - `GROK_4_HEAVY` → `grok-4-heavy` (enhanced capabilities)
  - `GROK_CODE_FAST_1` → `grok-code-fast-1` (agentic coding)
  - `GROK_2_1212` → `grok-2-1212`
  - `GROK_2_VISION_1212` → `grok-2-vision-1212`
  - `GROK_2_IMAGE_1212` → `grok-2-image-1212`
- Cohere ([API keys](https://dashboard.cohere.com/api-keys))
  - `COMMAND_A_03_2025` (default) → `command-a-03-2025`
  - `COMMAND_A_REASONING_08_2025` → `command-a-reasoning-08-2025`
  - `COMMAND_A_TRANSLATE_08_2025` → `command-a-translate-08-2025`
  - `COMMAND_R_PLUS_08_2024` → `command-r-plus-08-2024`
  - `COMMAND_R_08_2024` → `command-r-08-2024`
- Z.ai ([API keys](https://z.ai/manage-apikey/apikey-list))
  - `ZAI_DEFAULT` (default) → `glm-4.6` (override with `Z_MODEL_ID`)
  - `ZAI_GLM_4_5` → `glm-4.5`
  - `ZAI_GLM_4_5_AIR` → `glm-4.5-air`
  - `ZAI_GLM_4_6` → `glm-4.6`
  - `ZAI_GLM_4_7` → `glm-4.7`
  - `ZAI_GLM_4_7_FLASH` → `glm-4.7-flash`
- Kimi (Moonshot) ([API keys](https://platform.moonshot.cn/console/api-keys))
  - `KIMI_8K` (default) → `moonshot-v1-8k`
  - `KIMI_K2` → `kimi-k2-0905-preview`
  - `KIMI_K2_THINKING` → `kimi-k2-thinking`
  - `KIMI_K1_5` → `moonshot-v1-128k`
- Qwen, Llama, and Perplexity: provider shells are present but model mappings are not yet defined in `@ai-chat/core`.

Note: Providers may change available model IDs over time. Update the provider configs in `@ai-chat/core` accordingly.

## Environment Variables

Define these in `.env` (see `.env.example`):

- Required (by provider you use):

  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `GOOGLE_AI_API_KEY` (Gemini)
  - `MISTRAL_API_KEY`
  - `DEEPSEEK_API_KEY`
  - `GROK_API_KEY`
  - `COHERE_API_KEY`
  - `QWEN_API_KEY`
  - `KIMI_API_KEY`
  - `Z_API_KEY`
  - `TOGETHER_API_KEY`

- Optional (OpenAI-compatible base URLs):

  - `QWEN_BASE_URL` (e.g. `https://dashscope.aliyuncs.com/compatible-mode/v1`)
  - `KIMI_BASE_URL` (default `https://api.moonshot.cn/v1`)
  - `Z_BASE_URL` or `ZAI_BASE_URL` (default `https://api.z.ai/v1`)
  - `COHERE_BASE_URL` (default `https://api.cohere.ai/v1`)
  - `COHERE_MODEL_ID` (override default Cohere model ID)
  - `TOGETHER_BASE_URL` (defaults to `https://api.together.xyz/v1`)
  - `LLAMA_MODEL_ID` (override the Together Llama model slug)

- Conversation config:
  - `LOG_LEVEL` (default `info`)
  - `MAX_CONVERSATION_TURNS` (default `10`)
  - `CONVERSATION_TIMEOUT_MS` (default `300000`)

## Tests

Integration tests verify each provider returns exactly `OK` to a strict instruction. They skip automatically if the API key for that provider is not set.

- Run all: `npm run test:all`
- Run per provider:
  - `npm run test:openai`
  - `npm run test:anthropic`
  - `npm run test:mistral`
  - `npm run test:gemini`
  - `npm run test:deepseek`
  - `npm run test:grok`
  - `npm run test:qwen`
  - `npm run test:kimi`

Note: Running tests calls external APIs and requires working network access and valid keys.

## Extending the Project

### Adding a New AI Provider

1. Create a new service class in `src/services/` that extends `BaseAIService`
2. Add the provider configuration to `src/config/aiProviders.js`
3. Update the `AIServiceFactory` to support the new provider

### Customizing Conversation Flow

Modify the `ConversationManager` class to implement different conversation patterns or rules.

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
