# Vibe Chat – Contributor Guidance

Welcome! This document gives automated agents and humans a quick reference for how the repository is organized and how to make consistent changes. Treat the notes below as the default rules for every file in this project.

## Repository structure
- `/index.js` – Entry point that wires environment config, conversation management, and service startup.
- `/src/config/` – Configuration helpers and constants that describe available AI providers and default conversation settings.
- `/src/conversation/ConversationManager.js` – Core orchestration class that manages participants, message flow, and streaming responses.
- `/src/services/StatsTracker.js` – Lightweight metrics helper used to track conversation statistics.
- `/tests/` – Node test suites. `unit/` focuses on pure logic, while top-level `test-*.js` and `integration-ok-*.js` files exercise provider integrations and contract checks.
- `/ai-chat-realtime/` – Git sub-package that exposes the `@ai-chat/core` dependency used by the app. Contains Docker tooling, deployment scripts, and additional packages.
- `/play.js` – Scratchpad for manual experiments; avoid shipping critical logic here.

If you add new folders, extend this list so future contributors (and agents) stay oriented.

## Coding standards
- **Language**: Modern JavaScript with native ES Modules (`type: "module"`). Use `import`/`export` syntax exclusively.
- **Immutability first**: Default to `const`. Use `let` only when reassignment is required. Never use `var`.
- **Async discipline**: Prefer `async`/`await`. Always handle promise rejection paths. Bubble errors with meaningful context; do not silently swallow them.
- **Logging**: Use `console` sparingly and favor structured messages (`console.info`, `console.error`). Wrap noisy debug output behind environment flags when possible.
- **Function design**: Keep functions small and focused. Extract helpers when logic exceeds ~20 lines or mixes multiple responsibilities.
- **Validation**: Validate inputs to public functions and throw `Error` with actionable messages when expectations are violated.
- **Configuration**: Pull runtime configuration from environment variables or `src/config`. Avoid hard-coded provider keys in code or tests.
- **Documentation**: Use concise JSDoc blocks for exported functions/classes. Document parameters, return values, and side effects.
- **Styling**: Follow Prettier defaults (2 spaces, double quotes, trailing commas where valid). Use template literals for complex strings.
- **Testing**: Every behavior change should include or update a test in `tests/` whenever feasible. Prefer unit tests for pure logic; use integration scripts only when external APIs are mandatory.

## Git & review workflow
- Keep commits scoped and descriptive. Explain the intent and mention affected modules.
- When touching multiple areas, structure commits logically (e.g., "refactor", "feature", "tests").
- Ensure `npm test` passes locally before raising a PR. Add any new scripts to `package.json` if they are required to validate your change.
- Update relevant documentation (including this file) whenever you add or move major components.

## Environment notes
- Requires Node 20+ to match the tooling in `ai-chat-realtime`.
- Run `npm install` at the repository root to hydrate dependencies. The `@ai-chat/core` package is vendored inside `ai-chat-realtime/packages`.
- Integration tests may rely on third-party API keys. Use the `integration-ok-*.js` scripts as smoke checks when credentials are available.

## Quality checklist (before committing)
1. Format code (Prettier or `npm run lint` if configured in future).
2. Run `npm test` (or the targeted `npm run test:<provider>` script when working on integrations).
3. Confirm log noise is minimal and error messages are actionable.
4. Re-read new documentation or comments to ensure clarity for future automated agents.

Following these guardrails keeps the project accessible, testable, and easy to extend. Happy building!
