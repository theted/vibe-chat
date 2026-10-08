# Applying model changes

Reference for phase 4 of the `update-ai-models` skill: where a model is registered and how to add,
retire or remove one.

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

### 3. Nothing else — the rest is derived

Two registries that used to be hand-maintained are now computed, so do **not**
add entries to them:

- `packages/ai-configs/src/displayInfo.ts` — `AI_DISPLAY_INFO` is built from
  `DEFAULT_AI_PARTICIPANTS`.
- `packages/server/src/config/aiModels.ts` — `ENABLED_AI_MODELS` is built from
  participants whose `status` is `"active"`. To disable a model, set its
  participant status to `"inactive"`; `DISABLED_AI_MODELS` exists only as an
  ops-side override.

### 4. Default Model (only if it isn't the newest)
**Path:** `packages/ai-chat-core/src/config/aiProviders/defaults.ts`

Each provider defaults to the **first** model in its `models` object, which by
convention is the newest. So adding a new flagship at the top of the file is
usually enough. Add an `EXPLICIT_DEFAULTS` entry only when the default should
be something other than the first model.

### 5. Validate

```bash
bun run validate:models        # cross-references every registry
bun run validate:models:live   # also checks ids against the live OpenRouter catalog
```

This runs in CI. It catches dangling participants, models that never load,
alias/emoji collisions, providers missing an env var mapping, and — with
`--live` — OpenRouter ids that have been delisted upstream.

### OpenRouter-Backed Providers

When adding models via OpenRouter:

1. Use `https://openrouter.ai/api/v1/models` to discover current model IDs.
2. Create provider configs under `packages/ai-chat-core/src/config/aiProviders/providers/` with `OPENROUTER_API_KEY`.
3. Group participants by the actual provider name (e.g., Meta, NVIDIA) rather than "OpenRouter".
4. Add/refresh participants and display metadata as usual.

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
2. Remove from `participants.ts` (`displayInfo.ts` follows automatically)
3. Update `defaults.ts` if needed

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

`displayInfo.ts` picks the new participant up on its own.

## Notes

- Emojis should be unique per model within provider
- Provider personas (in provider files) rarely need updates
- Constants like `DEFAULT_MAX_TOKENS` are in `constants.ts`
- Type definitions are in `packages/ai-chat-core/src/types/index.ts`
- OpenRouter uses an OpenAI-compatible API. Keep provider grouping aligned to the original vendor for UI clarity.
- Some models reject a `temperature` (always-on thinking, or only default sampling allowed). Check the
  existing entries in that provider's file and leave `temperature` out the same way, with a comment.
