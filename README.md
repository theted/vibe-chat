# AI Chat

A real-time web chat application that enables multi-AI conversations. Different AI models can engage in conversations with each other or respond to user prompts.

## Features

- Real-time Socket.IO web chat with AI personas
- Support for multiple AI providers (OpenAI, Anthropic, Mistral, Gemini, DeepSeek, Grok, Cohere, Kimi, Z.ai, Qwen, Meta, and more)
- Built-in `@Chat` code assistant powered by RAG
- Conversation logging and history
- Extensible architecture for adding new AI providers

> **Note:** A CLI tool for scripted/headless conversations is also available. See [packages/ai-chat-cli/README.md](packages/ai-chat-cli/README.md) for documentation.

## Project Structure

```
ai-chat/
├── packages/
│   ├── ai-configs/       # Centralized AI model configurations, emojis, metadata
│   ├── ai-chat-core/     # Core library: orchestrator, AI services, utilities
│   ├── ai-chat-cli/      # Command-line interface for AI conversations
│   ├── mcp-assistant/    # Local code RAG helper (@Chat internal assistant)
│   ├── client/           # React frontend (web app)
│   └── server/           # WebSocket/Express backend (real-time chat)
├── docker-compose.yml          # Production Docker setup
├── docker-compose.dev.yml      # Development Docker setup
├── docker-compose.prod.yml     # Production-optimized Docker setup
├── .env.example                # Environment variable template
└── package.json                # Root workspace configuration
```

## Prerequisites

- Node.js (v22 or higher)
- API keys for the AI providers you want to use
- Docker (optional, for containerized deployment)

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/theted/vibe-chat.git
   cd ai-chat
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example` and add your API keys:

   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

4. Build the packages:
   ```bash
   npm run build
   ```

## Usage

### Development Server

```bash
# Using Docker (recommended)
npm run docker:dev

# Or run individually
npm --workspace @ai-chat/server run dev
npm --workspace @ai-chat/client run dev
```

The client runs on `http://localhost:3000` and the server on `http://localhost:3001`.

### Docker Commands

```bash
npm run docker:dev    # Development with live reload
npm run docker:prod   # Production build
npm run docker:clean  # Clean up containers and volumes
```

### Deployment (EC2 + ECR)

Production deploys target a single EC2 instance and use ECR to keep image history. See [deploy/ec2.md](deploy/ec2.md) for the workflow details and required GitHub secrets.

## Supported Providers and Models

Current defaults and IDs (see `packages/ai-chat-core/src/config/aiProviders`):

> Models marked with `(default)` are the provider default. Models are controlled via `participants.ts` (status) and `ENABLED_AI_MODELS` in the server config. See `AGENTS.md` for model management guidelines.

### OpenAI ([API keys](https://platform.openai.com/api-keys))

- `GPT5_2` (default) -> `gpt-5.2` (flagship reasoning)
- `GPT5_2_PRO` -> `gpt-5.2-pro` (extended compute)
- `GPT5_MINI` -> `gpt-5-mini` (fast brainstorming)
- `GPT5_NANO` -> `gpt-5-nano` (lightweight)
- `GPT4O` -> `gpt-4o`
- `GPT4_1` -> `gpt-4.1` (specialized for coding)
- `O3` -> `o3` (intelligent reasoning)
- `O4_MINI` -> `o4-mini` (fast reasoning for math/coding)

### Anthropic ([API keys](https://console.anthropic.com/settings/keys))

- `CLAUDE_OPUS_4_6` -> `claude-opus-4-6` (most intelligent, agents/coding)
- `CLAUDE_SONNET_4_5` (default) -> `claude-sonnet-4-5-20250929` (best balance)
- `CLAUDE_HAIKU_4_5` -> `claude-haiku-4-5-20251001` (fastest)
- `CLAUDE_OPUS_4_1` -> `claude-opus-4-1-20250805`

### Mistral ([API keys](https://console.mistral.ai/api-keys))

- `MISTRAL_LARGE` (default) -> `mistral-large-latest` (Mistral Large 3, MoE 41B active)
- `MISTRAL_MEDIUM` -> `mistral-medium-2508`
- `MISTRAL_SMALL` -> `mistral-small-2503`
- `CODESTRAL` -> `codestral-latest`
- `DEVSTRAL` -> `devstral-latest` (agentic coding)
- `DEVSTRAL_SMALL` -> `devstral-small-2-25-12` (24B coding)

### Gemini ([API keys](https://aistudio.google.com/app/apikey))

- `GEMINI_3_PRO` (default) -> `gemini-3-pro-preview` (reasoning + agentic)
- `GEMINI_3_FLASH` -> `gemini-3-flash-preview`
- `GEMINI_2_5_PRO` -> `gemini-2.5-pro`
- `GEMINI_2_5_FLASH` -> `gemini-2.5-flash`
- `GEMINI_2_5_FLASH_LITE` -> `gemini-2.5-flash-lite`

### DeepSeek ([API keys](https://platform.deepseek.com/api_keys))

- `DEEPSEEK_CHAT` (default) -> `deepseek-chat` (V3.1)
- `DEEPSEEK_R1` -> `deepseek-reasoner`

### Grok ([API keys](https://console.x.ai/keys))

- `GROK_4_0709` (default) -> `grok-4-0709` (256K context)
- `GROK_4_FAST_NON_REASONING` -> `grok-4-fast-non-reasoning` (2M context)
- `GROK_4_FAST_REASONING` -> `grok-4-fast-reasoning` (2M context)
- `GROK_4_HEAVY` -> `grok-4-heavy`
- `GROK_4_1_FAST_NON_REASONING` -> `grok-4-1-fast-non-reasoning` (2M context)
- `GROK_4_1_FAST_REASONING` -> `grok-4-1-fast-reasoning` (2M context)
- `GROK_3` -> `grok-3`
- `GROK_CODE_FAST_1` -> `grok-code-fast-1` (agentic coding)

### Cohere ([API keys](https://dashboard.cohere.com/api-keys))

- `COMMAND_A_03_2025` (default) -> `command-a-03-2025`
- `COMMAND_A_REASONING_08_2025` -> `command-a-reasoning-08-2025`
- `COMMAND_A_TRANSLATE_08_2025` -> `command-a-translate-08-2025`
- `COMMAND_R_PLUS_08_2024` -> `command-r-plus-08-2024`
- `COMMAND_R_08_2024` -> `command-r-08-2024`

### Z.ai ([API keys](https://z.ai/manage-apikey/apikey-list))

- `ZAI_GLM_4_7` -> `glm-4.7` (flagship, 200K context)
- `ZAI_GLM_4_7_FLASH` -> `glm-4.7-flash`
- `ZAI_GLM_4_7V` -> `glm-4.7v` (vision)
- `ZAI_GLM_4_6` -> `glm-4.6`
- `ZAI_DEFAULT` (default) -> configurable via `Z_MODEL_ID` env var

### Kimi (Moonshot) ([API keys](https://platform.moonshot.ai/console/api-keys))

- `KIMI_K2_5` (default) -> `kimi-k2.5` (1T MoE, multimodal)
- `KIMI_LATEST` -> `kimi-latest`
- `KIMI_THINKING_PREVIEW` -> `kimi-thinking-preview`

### Perplexity ([API keys](https://docs.perplexity.ai))

- `SONAR_PRO` (default) -> `sonar-pro` (deep retrieval, 200K context)
- `SONAR` -> `sonar` (lightweight search)
- `SONAR_REASONING_PRO` -> `sonar-reasoning-pro`
- `SONAR_DEEP_RESEARCH` -> `sonar-deep-research`

### Qwen/Alibaba ([API keys](https://dashscope.console.aliyun.com))

- `QWEN3_MAX` (default) -> `qwen3-max`
- `QWEN3_235B` -> `qwen3-235b-a22b`
- `QWEN3_CODER_PLUS` -> `qwen3-coder-plus`
- `QWEN_PLUS` -> `qwen-plus-latest`

### Meta (Llama)

Uses the Llama API OpenAI-compatible endpoint (default `https://api.llama.com/compat/v1`).

- `LLAMA_3_3_70B_INSTRUCT` -> `meta-llama/llama-3.3-70b-instruct`
- `LLAMA_3_3_70B_INSTRUCT_FREE` -> `meta-llama/llama-3.3-70b-instruct:free`
- `LLAMA_4_MAVERICK` -> `meta-llama/llama-4-maverick`
- `LLAMA_4_SCOUT` -> `meta-llama/llama-4-scout`

### OpenRouter (Amazon, NVIDIA, Xiaomi, MiniMax, Baidu, ByteDance, Hugging Face) ([API keys](https://openrouter.ai/keys))

These providers are accessed through OpenRouter's OpenAI-compatible API. Create an OpenRouter account, generate an API key from the Keys page, and set `OPENROUTER_API_KEY` to unlock all models below.

#### Amazon

- `NOVA_2_LITE_V1` -> `amazon/nova-2-lite-v1`
- `NOVA_PRO_V1` -> `amazon/nova-pro-v1`

#### NVIDIA

- `NEMOTRON_3_NANO_30B_A3B` -> `nvidia/nemotron-3-nano-30b-a3b`
- `NEMOTRON_3_NANO_30B_A3B_FREE` -> `nvidia/nemotron-3-nano-30b-a3b:free`
- `NEMOTRON_3_NANO_2_VL` -> `nvidia/nemotron-3-nano-2-vl`

#### Xiaomi

- `MIMO_V2_FLASH` -> `xiaomi/mimo-v2-flash`

#### MiniMax

- `MINIMAX_M2_1` -> `minimax/minimax-m2.1`
- `MINIMAX_M2` -> `minimax/minimax-m2`
- `MINIMAX_M1` -> `minimax/minimax-m1`

#### Baidu

- `ERNIE_4_5_21B_A3B_THINKING` -> `baidu/ernie-4.5-21b-a3b-thinking`
- `ERNIE_4_5_21B_A3B` -> `baidu/ernie-4.5-21b-a3b`
- `ERNIE_4_5_300B_A47B` -> `baidu/ernie-4.5-300b-a47b`

#### ByteDance

- `SEED_1_6_FLASH` -> `bytedance/seed-1.6-flash`
- `SEED_1_6` -> `bytedance/seed-1.6`

#### Hugging Face

- `ZEPHYR_141B_A35B` -> `huggingface/zephyr-141b-a35b`
- `ZEPHYR_7B_BETA` -> `huggingface/zephyr-7b-beta`

## Environment Variables

Define these in `.env` (see `.env.example`):

### Required (by provider you use)

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

### Server Configuration

- `PORT` (default `3001`)
- `CLIENT_URL` (default `http://localhost:3000`)
- `REDIS_URL` (default `redis://localhost:6379`)

### Server Behavior Flags

- `AI_CHAT_VERBOSE_CONTEXT` (default `false`)
- `AI_CHAT_ENABLE_PERSONAS` (default `false`)
- `AI_CHAT_SKIP_HEALTHCHECK` (default `false`)

### Optional Base URLs

- `QWEN_BASE_URL` (e.g. `https://dashscope.aliyuncs.com/compatible-mode/v1`)
- `KIMI_BASE_URL` (default `https://api.moonshot.ai/v1`)
- `Z_BASE_URL` or `ZAI_BASE_URL` (default `https://api.z.ai/v1`)
- `COHERE_BASE_URL` (default `https://api.cohere.ai/v1`)
- `TOGETHER_BASE_URL` (default `https://api.together.xyz/v1`)

### Optional OpenRouter Metadata

- `OPENROUTER_APP_NAME` (displayed in OpenRouter dashboard)
- `OPENROUTER_APP_URL` (sent as HTTP referer)

## Tests

Integration tests verify each provider returns expected responses. They skip automatically if the API key is not set.

```bash
# Run all tests
npm test

# Run specific workspace tests
npm run test:core
npm run test:client
npm run test:cli

# Run provider-specific tests
npm run test:openai
npm run test:anthropic
npm run test:mistral
npm run test:gemini
npm run test:deepseek
npm run test:grok
npm run test:all
```

## Extending the Project

### Adding a New AI Provider

1. Create a new service class in `packages/ai-chat-core/src/services/` that extends `BaseAIService`
2. Add provider configuration to `packages/ai-chat-core/src/config/aiProviders/providers/`
3. Export from `packages/ai-chat-core/src/index.ts`
4. Add participant config to `packages/ai-configs/src/`

### Package Scripts

```bash
npm run build:core    # Build core library
npm run build:cli     # Build CLI (includes core)
npm run build:server  # Build server
npm run build:client  # Build client
npm run build         # Build all packages
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
