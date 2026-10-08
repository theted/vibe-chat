---
name: update-ai-models
description: Refresh vibe-chat's AI model catalog. Researches every provider in parallel (one model-scout subagent each), reports new and retired models, then applies the approved changes and validates the registry.
argument-hint: "[provider ...] [--report-only]"
disable-model-invocation: true
allowed-tools: Bash(grep *) Bash(bun run validate:models*)
---

# Update AI Models

Arguments: `$ARGUMENTS`

- Provider file names (`anthropic mistral`) limit the run to those providers. None means all of them.
- `--report-only` stops after the report in phase 3, without editing anything.

## Providers in this checkout

One line per provider file, with the env var holding its API key. `OPENROUTER_API_KEY` means the
vendor is served through OpenRouter rather than its own API.

!`grep -oE 'apiKeyEnvVar: "[A-Z_]+"' packages/ai-chat-core/src/config/aiProviders/providers/*.ts`

## Phase 1: research in parallel

Spawn `model-scout` subagents with the Agent tool, and **start every scout before waiting on any of
them**. Subagents run in the background by default, so they work concurrently and report back as
each one finishes:

- **One scout per direct provider** (any key other than `OPENROUTER_API_KEY`), pointed at its docs
  page from the table below.
- **OpenRouter-backed vendors in groups of up to 6 per scout.** Their source is
  `https://openrouter.ai/<slug>`, where the slug is the part before `/` in the vendor's model ids.

A scout sees nothing from this conversation. Each prompt must carry everything it needs: provider
name(s), config file path(s), and source URL(s).

| Provider file | Official model docs |
|---|---|
| anthropic | https://platform.claude.com/docs/en/models/overview (retirements: https://platform.claude.com/docs/en/about-claude/model-deprecations) |
| openai | https://platform.openai.com/docs/models |
| gemini | https://ai.google.dev/gemini-api/docs/models |
| mistral | https://docs.mistral.ai/getting-started/models/models_overview/ |
| cohere | https://docs.cohere.com/docs/models |
| grok | https://docs.x.ai/docs/models |
| deepseek | https://api-docs.deepseek.com/quick_start/pricing |
| perplexity | https://docs.perplexity.ai/guides/model-cards |
| qwen | https://help.aliyun.com/zh/model-studio/getting-started/models |
| kimi | https://platform.moonshot.cn/docs/intro |
| zai | https://open.bigmodel.cn/dev/howuse/model |
| llama | https://llama.developer.meta.com/docs/models |

A provider file that is missing from this table and is not OpenRouter-backed still gets a scout:
tell it to find the vendor's official models page with a web search.

## Phase 2: gather

Each scout replies with JSON in the shape defined in `.claude/agents/model-scout.md`.

- **A failed or missing reply means "not checked", never "no changes".** Report it as not checked.
  Retry a failed scout once if the failure looks transient (timeout, redirect, rate limit).
- **A spawn refused with "Concurrent subagent limit reached"** is not a failure. Spawn the
  remaining scouts as running ones finish, and don't drop any.
- **Model ids are claims until checked.** Keep only entries with an `evidenceUrl`. For every new id
  and id change, fetch the evidence page yourself and ask for the id verbatim. Scouts read pages
  through WebFetch summaries, and a summary can invent a plausible id. Ids that don't show up, and
  low-confidence entries, go under "unconfirmed" in the report, not into the change list.

## Phase 3: report

One table: provider · new models · to retire · id changes · status (`ok` / `partial` /
`not checked`). Under it, list each proposed change with its evidence URL.

With `--report-only`, stop here. Otherwise ask the user which changes to apply before editing.

## Phase 4: apply

Make the approved changes as described in [implementation.md](implementation.md). It covers which
files to touch, naming conventions, deprecation and an example.

## Phase 5: validate

```bash
bun run validate:models
bun run validate:models:live   # only if OPENROUTER_API_KEY is set
```

Fix anything they report before finishing, then summarise what changed per provider.
