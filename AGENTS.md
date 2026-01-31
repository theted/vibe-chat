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

## Git & review workflow

- Keep commits scoped and descriptive. Explain the intent and mention affected modules.
- When touching multiple areas, structure commits logically (e.g., "refactor", "feature", "tests").
- Ensure `npm test` passes locally before raising a PR. Add any new scripts to `package.json` if they are required to validate your change.
- Update relevant documentation (including this file) whenever you add or move major components.

## Environment notes

- Requires Node 22+ for all packages.
- Run `npm install` at the repository root to hydrate all workspace dependencies.
- Use `npm run build` to build all packages in the correct order.
- Use `npm run docker:dev` to start the development environment with Docker.
- Integration tests may rely on third-party API keys. Use `npm run test:<provider>` scripts when credentials are available.

## Quality checklist (before committing)

1. Format code (`npm run format` or `npm run format:fix`) and lint (`npm run lint`).
2. Run `npm test` or the targeted test script for the package you're working on.
3. Confirm log noise is minimal and error messages are actionable.
4. Re-read new documentation or comments to ensure clarity for future automated agents.

Following these guardrails keeps the project accessible, testable, and easy to extend. Happy building!
