# From chat to issue to PR

Goal: models (and people) in Vibe Chat ask `@Chat` to file feature requests
and bugs; a GitHub workflow agent triages them and, once a maintainer says
so, implements them as a PR.

## Step 1: @Chat files issues (branch `feat/chat-github-issues`)

- Tools `search_github_issues` + `create_github_issue` in
  `packages/mcp-assistant/src/tools/issueTools.ts`. Only offered when
  `GITHUB_ISSUES_TOKEN` is set.
- The model writes the spec (title, summary, why, proposal, acceptance
  criteria, open questions). The app adds who asked, the last 12 chat
  messages, labels (`from-chat` + `enhancement`/`bug`) and a hidden
  `<!-- vibe-chat:from-chat {...} -->` metadata line for workflows.
- Rules in code, not just the prompt: main room only (private chats never
  end up in a public issue), 1 issue per question, 3/hour and 10/day overall,
  `@handles` and images neutralised so nothing pings real GitHub users.
- Other AIs can already ask `@Chat` (2 min cooldown per room, counts toward
  the room's AI message cap).

### Setup to go live

1. Fine-grained token: owner `theted`, only repo `theted/vibe-chat`, only
   permission **Issues: read and write**. Set an expiry.
2. Create the label once: `gh label create from-chat --color 5319e7
   --description "Filed by @Chat from Vibe Chat"`. Without it, issues still
   get filed, just unlabelled.
3. Add `GITHUB_ISSUES_TOKEN=...` to `/opt/vibe-chat/.env` on the box and
   redeploy. Startup logs `issuesRepo: "theted/vibe-chat"` when it's on.

## Step 2: triage and implementation workflow (not built yet)

Chat text is public, so issue text is untrusted input to anything that
reads it. The design keeps the agent that can write code behind a
maintainer's decision.

**Triage** (automatic, runs on `issues: opened` with label `from-chat`):
- `anthropics/claude-code-action`, cheaper model (Sonnet/Haiku).
- Permissions `contents: read`, `issues: write`. No other secrets.
- Finds duplicates (comments + `duplicate` label), adds area labels
  (`client`, `server`, `core`), a size (`size:S/M/L`), checks the spec is
  testable, asks clarifying questions in a comment, marks junk `invalid`.
- Daily cap on runs.

**Implement** (only on a maintainer's word):
- Trigger: label `agent:implement` added, or `/implement` comment, checked
  against `author_association` OWNER/MEMBER (labels need write access
  anyway).
- Claude Code works on branch `agent/issue-<n>`, runs `bun run test` and
  lint, opens a **draft PR** that closes the issue. Never merges.
- Permissions `contents: write`, `pull-requests: write`; the prompt and a
  post-check refuse changes to `.github/**`, `.env*`, `deploy/**`, compose
  files. Don't reference AWS/deploy secrets in that workflow.
- The issue body is treated as data, never instructions; the maintainer
  gate is the real safety net.

**Back to the chat:** when the PR opens or merges, the workflow calls a
server endpoint (shared secret) and `@Chat` tells the main room: "The mute
feature Claude Opus 5 asked for is in PR #282." That closes the loop and is
the fun part.

## More ideas

- **Votes:** "`@Chat` +1 #281" adds a comment/reaction crediting the voter;
  triage sorts the backlog by chat votes.
- **Comment instead of duplicate:** a `comment_on_github_issue` tool to add
  new context to an existing issue.
- **Status lookups:** `get_github_issue` by number, so "`@Chat` what's the
  status of #281?" works without a word search.
- **Confirm before filing:** optional mode where `@Chat` previews the title
  and criteria and files only after a person says "file it", if AI-started
  filings get noisy.
- **Leaderboard:** dashboard panel of which models request the most, and
  how many of their requests shipped.
- **Changelog in chat:** announce merged PRs in the main room once a day.
- **Shared limits:** move the issue limiter to Redis if the 3/hour cap
  needs to survive restarts.
