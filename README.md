# Vibe Chat

A Node.js project that lets different AI systems talk to each other, and also query single models directly.

## Overview

This project creates a platform where different AI models (OpenAI, Anthropic, Mistral, Gemini, Deepseek, Grok, Cohere, Qwen, Kimi, Z.ai) can engage in conversations with each other or respond to a single prompt. The system manages the conversation flow, handles API interactions, and logs the conversation history.

## Features

- Support for multiple AI providers (OpenAI, Anthropic, Mistral, Gemini, Deepseek, Grok, Cohere, Qwen, Kimi, Z.ai)
- Extensible architecture for adding new AI providers
- Automatic conversation management
- Conversation logging and history
- Configurable conversation parameters

## Project Structure

```
vibe-chat/
├── .env.example          # Example environment variables
├── .gitignore            # Git ignore file
├── index.js              # Main entry point
├── package.json          # Project configuration
├── README.md             # Project documentation
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

There are two modes: multi-model conversation and single-prompt responses.

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

Current defaults and IDs (see `src/config/aiProviders.js`):

- OpenAI
  - `GPT4O` → `gpt-4o`
  - `GPT4_1` → `gpt-4.1` (specialized for coding)
  - `GPT4_5` → `gpt-4.5` (largest chat model)
  - `GPT5` → `gpt-5` (most advanced with multimodal)
  - `O3` → `o3-2025-04-16` (intelligent reasoning model)
  - `O3_MINI` → `o3-mini` (cost-efficient reasoning)
  - `O3_PRO` → `o3-pro` (most capable reasoning)
  - `O4_MINI` → `o4-mini` (fast reasoning for math/coding)
  - `GPT35_TURBO` → `gpt-3.5-turbo`
- Anthropic
  - `CLAUDE3_7_SONNET` → `claude-3-7-sonnet-20250219` (hybrid reasoning)
  - `CLAUDE3_5_HAIKU_20241022` → `claude-3-5-haiku-20241022`
  - `CLAUDE_SONNET_4` → `claude-sonnet-4-20250514`
  - `CLAUDE_SONNET_4_5` (default) → `claude-sonnet-4-5` (best coding model)
  - `CLAUDE_OPUS_4` → `claude-opus-4-20250514`
  - `CLAUDE_OPUS_4_1` → `claude-opus-4-1` (industry leader for coding/agents)
- Mistral
  - `MISTRAL_LARGE` → `mistral-large-latest`
  - `MISTRAL_MEDIUM` → `mistral-medium-latest`
  - `MISTRAL_SMALL` → `mistral-small-latest`
  - `MINISTRAL_8B_LATEST` → `ministral-8b-latest`
  - `OPEN_MISTRAL_NEMO` → `open-mistral-nemo`
- Gemini
  - `GEMINI_PRO` → `gemini-2.0-pro`
  - `GEMINI_FLASH` → `gemini-2.0-flash`
  - `GEMINI_25` (default) → `gemini-2.5-pro`
- Deepseek
  - `DEEPSEEK_CHAT` → `deepseek-chat`
  - `DEEPSEEK_CODER` → `deepseek-coder`
  - `DEEPSEEK_REASONER` → `deepseek-reasoner`
- Grok
  - `GROK_3` (default) → `grok-3`
  - `GROK_3_MINI` → `grok-3-mini`
  - `GROK_2_1212` → `grok-2-1212`
  - `GROK_2_VISION_1212` → `grok-2-vision-1212`
  - `GROK_4_0709` → `grok-4-0709`
  - `GROK_4_FAST_NON_REASONING` → `grok-4-fast-non-reasoning` (2M context)
  - `GROK_4_FAST_REASONING` → `grok-4-fast-reasoning` (2M context)
  - `GROK_4_HEAVY` → `grok-4-heavy` (enhanced capabilities)
  - `GROK_CODE_FAST_1` → `grok-code-fast-1` (agentic coding)
  - `GROK_2_IMAGE_1212` → `grok-2-image-1212`
- Cohere
  - `COMMAND_A_03_2025` (default) → `command-a-03-2025`
  - `COMMAND_A_REASONING_08_2025` → `command-a-reasoning-08-2025`
  - `COMMAND_A_VISION_07_2025` → `command-a-vision-07-2025`
  - `COMMAND_R_08_2024` → `command-r-08-2024`
  - `COMMAND_R7B_12_2024` → `command-r7b-12-2024`
- Z.ai
  - `ZAI_DEFAULT` (default) → `z-1` (override with `Z_MODEL_ID`)
- Qwen
  - `QWEN3_MAX` (default) → `qwen3-max` (flagship for complex tasks)
  - `QWEN3_PLUS` → `qwen-plus` (balanced performance)
  - `QWEN3_FLASH` → `qwen-flash` (fastest, most cost-effective)
  - `QWEN3_CODER_PLUS` → `qwen3-coder-plus` (enhanced code generation)
  - `QWEN3_VL_PLUS` → `qwen3-vl-plus` (vision-language model)
  - `QWEN_MAX_2025` → `qwen-max-2025-01-25` (large-scale MoE)
- Kimi (Moonshot)
  - `KIMI_8K` (default) → `moonshot-v1-8k`
  - `KIMI_32K` → `moonshot-v1-32k`
  - `KIMI_128K` → `moonshot-v1-128k`

Note: Providers may change available model IDs over time. Update `aiProviders.js` accordingly.

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

- Optional (OpenAI-compatible base URLs):
  - `QWEN_BASE_URL` (e.g. `https://dashscope.aliyuncs.com/compatible-mode/v1`)
  - `KIMI_BASE_URL` (default `https://api.moonshot.cn/v1`)
  - `Z_BASE_URL` or `ZAI_BASE_URL` (default `https://api.z.ai/v1`)
  - `COHERE_BASE_URL` (default `https://api.cohere.ai/v1`)
  - `COHERE_MODEL_ID` (override default Cohere model ID)

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
