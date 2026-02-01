# Skill: Update AI Models

Update AI provider model configurations by checking API documentation, adding new models, and deprecating outdated ones.

## Overview

This skill walks through all AI providers, fetches their latest model information from API documentation, and updates the codebase accordingly.

## Provider Documentation URLs

Check these official sources for model updates:

| Provider | API Documentation |
|----------|-------------------|
| Anthropic | https://docs.anthropic.com/en/docs/about-claude/models |
| OpenAI | https://platform.openai.com/docs/models |
| Google/Gemini | https://ai.google.dev/gemini-api/docs/models |
| Mistral | https://docs.mistral.ai/getting-started/models/models_overview/ |
| Cohere | https://docs.cohere.com/docs/models |
| xAI/Grok | https://docs.x.ai/docs/models |
| DeepSeek | https://api-docs.deepseek.com/quick_start/pricing |
| Perplexity | https://docs.perplexity.ai/guides/model-cards |
| Qwen/Alibaba | https://help.aliyun.com/zh/model-studio/getting-started/models |
| Moonshot/Kimi | https://platform.moonshot.cn/docs/intro |
| Z.ai (Zhipu) | https://open.bigmodel.cn/dev/howuse/model |

## Files to Update

When adding or updating models, modify these files in order:

### 1. Provider Configuration
**Path:** `packages/ai-chat-core/src/config/aiProviders/providers/{provider}.ts`

Add model to the `models` object:
```typescript
MODEL_KEY: {
  id: "actual-api-model-id",
  maxTokens: DEFAULT_MAX_TOKENS,
  temperature: DEFAULT_TEMPERATURE,
  systemPrompt: "You are {Model Name} by {Provider}. {Brief description of capabilities}.",
},
```

### 2. Participants List
**Path:** `packages/ai-configs/src/participants.ts`

Add entry to `DEFAULT_AI_PARTICIPANTS` array:
```typescript
{
  id: "PROVIDER_MODEL_KEY",
  name: "Display Name",
  alias: "shorthand-alias",
  provider: "Provider Name",
  status: "active",
  emoji: "🆕",
},
```

### 3. Display Info
**Path:** `packages/ai-configs/src/displayInfo.ts`

Add entry to `AI_DISPLAY_INFO` object:
```typescript
PROVIDER_MODEL_KEY: {
  displayName: "Display Name",
  alias: "shorthand-alias",
  emoji: "🆕",
},
```

### 4. Default Model (if applicable)
**Path:** `packages/ai-chat-core/src/config/aiProviders/defaults.ts`

Update if new model should be default:
```typescript
[PROVIDER.name]: PROVIDER.models.NEW_MODEL_KEY,
```

## Naming Conventions

### Model Keys (TypeScript)
- Use UPPER_SNAKE_CASE
- Format: `MODEL_NAME` or `MODEL_NAME_VERSION`
- Examples: `GPT4O`, `CLAUDE_SONNET_4_5`, `MISTRAL_LARGE`

### Participant IDs
- Format: `PROVIDER_MODEL_KEY`
- Examples: `OPENAI_GPT4O`, `ANTHROPIC_CLAUDE_SONNET_4`

### Aliases
- Use lowercase with hyphens
- Keep concise for easy mentions
- Examples: `gpt-4o`, `claude-sonnet-4`, `mistral`

### API Model IDs
- Use exact ID from provider documentation
- Include version dates when provided
- Examples: `claude-sonnet-4-20250514`, `gpt-4o-2024-08-06`

## Deprecation Process

To deprecate a model (not remove entirely):

1. Set `status: "inactive"` in `participants.ts`
2. Keep model definition in provider file for historical reference
3. Update default model if deprecated model was default

To fully remove a deprecated model:

1. Delete from provider's `models` object
2. Remove from `participants.ts`
3. Remove from `displayInfo.ts`
4. Update `defaults.ts` if needed

## Step-by-Step Workflow

### Phase 1: Research
1. Visit each provider's documentation URL
2. Note any new models or deprecations
3. Compare with current configuration
4. Document changes needed

### Phase 2: Implementation
For each new model:
1. Add to provider configuration file
2. Add to participants list
3. Add to display info
4. Choose appropriate emoji (unique per model)

For deprecations:
1. Update status to "inactive"
2. Consider if default needs updating

### Phase 3: Verification
1. Check TypeScript compilation: `npm run build`
2. Verify imports resolve correctly
3. Test model appears in UI (if applicable)

## Example: Adding a New Model

Adding "Claude 5 Opus" to Anthropic:

**1. Update `providers/anthropic.ts`:**
```typescript
CLAUDE_OPUS_5: {
  id: "claude-opus-5-20260101",
  maxTokens: DEFAULT_MAX_TOKENS,
  temperature: DEFAULT_TEMPERATURE,
  systemPrompt:
    "You are Claude Opus 5 by Anthropic. Provide exceptionally thorough responses.",
},
```

**2. Update `participants.ts`:**
```typescript
{
  id: "ANTHROPIC_CLAUDE_OPUS_5",
  name: "Claude Opus 5",
  alias: "claude-opus-5",
  provider: "Anthropic",
  status: "active",
  emoji: "🎼",
},
```

**3. Update `displayInfo.ts`:**
```typescript
ANTHROPIC_CLAUDE_OPUS_5: {
  displayName: "Claude Opus 5",
  alias: "claude-opus-5",
  emoji: "🎼",
},
```

## Current Providers

| Provider | Config File | Model Count |
|----------|-------------|-------------|
| Anthropic | `anthropic.ts` | 8 models |
| OpenAI | `openai.ts` | ~10 models |
| Google/Gemini | `gemini.ts` | 4 models |
| Mistral | `mistral.ts` | 7 models |
| Cohere | `cohere.ts` | 5 models |
| xAI/Grok | `grok.ts` | 7 models |
| DeepSeek | `deepseek.ts` | 4 models |
| Perplexity | `perplexity.ts` | 4 models |
| Qwen | `qwen.ts` | 6 models |
| Moonshot/Kimi | `kimi.ts` | 4 models |
| Z.ai | `zai.ts` | 6 models |

## Notes

- Always use web search or WebFetch to get latest model info from docs
- Emojis should be unique per model within provider
- Provider personas (in provider files) rarely need updates
- Constants like `DEFAULT_MAX_TOKENS` are in `constants.ts`
- Type definitions are in `packages/ai-chat-core/src/types/index.ts`
