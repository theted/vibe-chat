# Vibe Chat – Contributor Guidance

Welcome! This document gives automated agents and humans a quick reference for how the repository is organized and how to make consistent changes. Treat the notes below as the default rules for every file in this project.

## Repository structure

This is a monorepo with multiple packages under `/packages/`:

### Core packages

- `/packages/ai-configs/` – Shared AI participant configurations and emoji/mention mappings.
- `/packages/ai-chat-core/` – Reusable AI service wrappers, configuration helpers, and orchestration utilities. The `@ai-chat/core` package is consumed by all other packages.
- `/packages/mcp-assistant/` – Local MCP server package that powers the internal @Chat assistant.

### Application packages

- `/packages/server/` – WebSocket-based chat server that hosts real-time AI conversations.
- `/packages/server/src/utils/` – Server-only helpers for app startup, lifecycle, and shared state.
- `/packages/client/` – React-based web client for the chat application.
- `/packages/ai-chat-cli/` – CLI tool for running AI-to-AI conversations from the terminal.

### Root-level files

- `/package.json` – Workspace root with npm workspace configuration and unified scripts.
- `/docker-compose*.yml` – Docker Compose files for development, production, and debugging.
- `/tests/e2e/` – End-to-end tests that span multiple packages.
- `/deploy/` – Deployment-related scripts and configurations.
- `/.github/workflows/` – CI/CD pipelines for testing and deployment.

If you add new folders, extend this list so future contributors (and agents) stay oriented.

## Coding standards

- **Language**: Modern TypeScript with native ES Modules (`type: "module"`). Use `import`/`export` syntax exclusively.
- **Immutability first**: Default to `const`. Use `let` only when reassignment is required. Never use `var`.
- **Async discipline**: Prefer `async`/`await`. Always handle promise rejection paths. Bubble errors with meaningful context; do not silently swallow them.
- **Logging**: Use `console` sparingly and favor structured messages (`console.info`, `console.error`). Wrap noisy debug output behind environment flags when possible.
- **Function design**: Keep functions small and focused. Extract helpers when logic exceeds ~20 lines or mixes multiple responsibilities.
- **Validation**: Validate inputs to public functions and throw `Error` with actionable messages when expectations are violated.
- **Configuration**: Pull runtime configuration from environment variables or package config directories. Avoid hard-coded provider keys in code or tests.
- **Documentation**: Use concise JSDoc blocks for exported functions/classes. Document parameters, return values, and side effects.
- **Styling**: Follow Prettier defaults (2 spaces, double quotes, trailing commas where valid). Use template literals for complex strings.
- **Testing**: Every behavior change should include or update a test whenever feasible. Each package owns its tests.

## AI model management

This project supports 19+ AI providers. Model lifecycle is controlled through two layers that must stay in sync.

### How model activation works

A model must pass **three gates** before the server initializes it:

1. **Provider config** (`packages/ai-chat-core/src/config/aiProviders/providers/{provider}.ts`) – model must be defined in the provider's `models` object.
2. **Participants list** (`packages/ai-configs/src/participants.ts`) – model must have `status: "active"`. Models with `status: "inactive"` are blocked from initialization at the server layer, regardless of other settings.
3. **Enabled models list** (`packages/server/src/config/aiModels.ts`) – model ID must be present (uncommented) in `ENABLED_AI_MODELS`.

The server's `getProviderAIConfigs()` checks all three. If any gate rejects the model, it is not loaded.

### Adding a new model

1. Add model definition in the provider config file (with `id`, `maxTokens`, `temperature`, `systemPrompt`).
2. Add participant entry in `participants.ts` with `status: "active"` and a unique emoji.
3. Add mention mappings in `lookups.ts` (alias -> canonical name).
4. Add the `PROVIDER_MODEL_KEY` string to `ENABLED_AI_MODELS` in `packages/server/src/config/aiModels.ts`.
5. Update `defaults.ts` if the new model should become the provider default.
6. **Do not** edit `displayInfo.ts` – it auto-derives from participants.

### Deprecating a model

1. Set `status: "inactive"` in `participants.ts`. This is the single source of truth for model lifecycle.
2. Comment out the entry in `ENABLED_AI_MODELS` (prefix with `// inactive:` for clarity).
3. Keep the model definition in the provider config for historical reference.
4. Update `defaults.ts` if the deprecated model was the provider default.
5. Update mention mappings in `lookups.ts` if generic aliases (e.g., `opus`, `kimi`) pointed to it.

### Conventions

- **Participant ID format**: `PROVIDER_MODEL_KEY` (e.g., `ANTHROPIC_CLAUDE_OPUS_4_6`).
- **Model key format**: `UPPER_SNAKE_CASE` in provider files.
- **Aliases**: lowercase with hyphens (e.g., `claude-opus-4-6`).
- **Emojis**: unique per model within a provider; reuse across providers is fine.
- **Commented-out models**: use `// inactive:` prefix in `ENABLED_AI_MODELS` to distinguish from temporarily disabled models (plain `//`).

## Git & review workflow

- Keep commits scoped and descriptive. Explain the intent and mention affected modules.
- When touching multiple areas, structure commits logically (e.g., "refactor", "feature", "tests").
- Ensure `pnpm test` passes locally before raising a PR. Add any new scripts to `package.json` if they are required to validate your change.
- Update relevant documentation (including this file) whenever you add or move major components.

## Environment notes

- Requires Node 22+ and Bun v1.2+ for all packages.
- Run `pnpm install` at the repository root to hydrate all workspace dependencies.
- Use `pnpm run build` to build all packages in the correct order.
- Use `pnpm run docker:dev` to start the development environment with Docker.
- Integration tests may rely on third-party API keys. Use `pnpm run test:<provider>` scripts when credentials are available.

## Quality checklist (before committing)

1. Format code (`pnpm run format` or `pnpm run format:fix`) and lint (`pnpm run lint`).
2. Run `pnpm test` or the targeted test script for the package you're working on.
3. Confirm log noise is minimal and error messages are actionable.
4. Re-read new documentation or comments to ensure clarity for future automated agents.

Following these guardrails keeps the project accessible, testable, and easy to extend. Happy building!
