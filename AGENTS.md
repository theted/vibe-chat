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

- `/package.json` – Workspace root with Bun workspace configuration and unified Turbo scripts.
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

This project supports 28+ AI providers (including OpenRouter-based providers). Model lifecycle is controlled by **participant status** as the single source of truth — there is no hand-maintained allowlist to keep in sync.

### How model activation works

A model is initialized by the server when it passes **two gates**:

1. **Provider config** (`packages/ai-chat-core/src/config/aiProviders/providers/{provider}.ts`) – model must be defined in the provider's `models` object with a valid API `id`.
2. **Participant status** (`packages/ai-configs/src/participants.ts`) – model must have `status: "active"`. Entries with `status: "inactive"` (or absent) are never loaded.

The server's `ENABLED_AI_MODELS` (`packages/server/src/config/aiModels.ts`) is **derived automatically** from active participants via `deriveEnabledModels(getActiveParticipants())` — do not edit it by hand. For a server-only disable without touching participants, list the participant ID(s) in the `DISABLED_AI_MODELS` env var (comma-separated).

**Startup is stale-while-revalidate** (see project memory / `model-health.json`): every active model instantiates instantly with no API call; untrusted ones are health-checked in the background (8 in parallel) and removed live on failure. So a wrong/retired API `id` will not crash startup — it silently drops out after the background check. Verify IDs against provider docs rather than relying on a clean boot.

### Adding a new model

1. Add the model definition in the provider config file (with `id`, `maxTokens`, `temperature`, `systemPrompt`). Use the exact API `id` from the provider's docs.
2. Add a participant entry in `participants.ts` with `status: "active"` and a unique emoji.
3. Add mention mappings in `lookups.ts` (alias -> canonical name) if it needs a shorthand or should claim a bare provider alias.
4. Update `defaults.ts` if the new model should become the provider default.
5. **Do not** edit `displayInfo.ts` (auto-derives from participants) or `ENABLED_AI_MODELS` (auto-derives from active participants).

### Deprecating / removing a model

A model that is retired or pulled by the provider (e.g. `claude-fable-5`, suspended 2026-06-12 by US export-control directive) must be taken out of the active set:

1. Remove the participant entry from `participants.ts` (or set `status: "inactive"` to keep it for reference). This alone removes it from `ENABLED_AI_MODELS`.
2. Keep — or remove — the provider-config definition; leave a dated `//` comment noting why it went away.
3. Update `defaults.ts` if the model was the provider default (point it at the most capable generally-available model).
4. Update `lookups.ts` if any generic/bare alias (e.g., `claude`, `opus`, `kimi`) resolved to it.

### Conventions

- **Participant ID format**: `PROVIDER_MODEL_KEY` (e.g., `ANTHROPIC_CLAUDE_OPUS_4_8`).
- **Model key format**: `UPPER_SNAKE_CASE` in provider files.
- **Aliases**: lowercase with hyphens (e.g., `claude-opus-4-8`).
- **Emojis**: unique per model within a provider; reuse across providers is fine.
- **Dropped models**: leave a short dated comment (e.g., `// gpt-5.1 superseded — removed 2026-06-10`) in the provider file instead of silent deletion.

## Git & review workflow

- Keep commits scoped and descriptive. Explain the intent and mention affected modules.
- When touching multiple areas, structure commits logically (e.g., "refactor", "feature", "tests").
- Ensure `bun run test` passes locally before raising a PR. Add any new scripts to `package.json` if they are required to validate your change.
- Update relevant documentation (including this file) whenever you add or move major components.

## Environment notes

- Requires Node 22+ and Bun v1.2+ for all packages.
- Run `bun install` at the repository root to hydrate all workspace dependencies.
- Use `bun run build` to build all packages in the correct order.
- Use `bun run docker:dev` to start the development environment with Docker.
- Integration tests may rely on third-party API keys. Use `bun run test:<provider>` scripts when credentials are available.

## Quality checklist (before committing)

1. Format code (`bun run format` or `bun run format:fix`) and lint (`bun run lint`).
2. Run `bun run test` or the targeted test script for the package you're working on.
3. Confirm log noise is minimal and error messages are actionable.
4. Re-read new documentation or comments to ensure clarity for future automated agents.

Following these guardrails keeps the project accessible, testable, and easy to extend. Happy building!
