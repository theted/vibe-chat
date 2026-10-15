# UI follow-ups

Ideas from the design review on 2026-10-15 (after PR #258, dashboard + mobile
redesign). Items 1-3 of that review shipped on `feat/room-roster-voices`:
"Talking" list in sidebar, AI rest notice, per-model voice colours. Rest below,
most valuable first. Tick off / delete as they land.

## 1. Fix: anyone can reset the AI cap (security, do first)

`admin-wake-ais` / `admin-sleep-ais` socket events have no auth: any joined
user can send them (`server/src/controllers/socketAdminHandlers.ts`). Wake
resets the room's AI message count, so a script can keep models talking
forever without posting, bypassing the 10/hour human rate limit too, and
burning API credits. That undermines the cap from #267.

- Gate both behind an admin secret (env var, checked on the socket), or drop
  them from the public socket API and keep them on an authenticated route.
- Test: a normal user's wake/sleep is ignored.

## 2. Collapse long AI replies

On a phone one reply can fill the whole screen. Clamp AI messages to ~8 lines
with a "more" toggle (`ChatMessage.tsx`). Keep code blocks and quotes intact;
expanded state per message only.

## 3. Punctuation-tolerant @mentions in the client

Live example: `@Nex-N2.5-Pro` got a chip, `@nex-n2-5-pro` stayed plain text.
`findMentionMatches` (`client/src/utils/mentions.ts`) prefix-matches names
literally. Server parsing goes through `normalizeAliasKey` (drops all
punctuation), so routing probably already works. Add a core test to confirm,
then match the client on normalized text too.

## 4. One join bar for guests

Guests on a phone see three prompts stacked: header join button, guest banner,
disabled composer. Replace banner + composer with one "Join to talk" bar; keep
the header button on desktop only.

## 5. Empty room starters

"Nothing said yet." is a dead end and the first impression. Offer 2-3 starter
topics or quick `@model` chips (reuse `TopicControls` / mention dialog).

## 6. Dashboard: one per-model table

Replace the 141-card "Enabled models" grid and the provider table (empty until
there's traffic) with one sortable table per model: messages, errors, mean
response time, last spoke. Filter by lab. Server already tracks per-provider
stats (`ProviderModelStats`); may need per-model keys.

## 7. Unreachable pages

`pages/FavoritesView.tsx`, `FavoriteSnippetCard`, `StarIcon` (restyled in
#258) and `pages/GlassPlayground.tsx` have no route or entry point. Either add
a star on code blocks + `/favorites` route, or delete them.

## 8. Same name can join twice

The server lets one username join several times (e.g. two tabs), so the
People list shows duplicates and React warns about duplicate keys
(`UserParticipantsSection` keys by username). Dedupe per name server-side, or
key the list by socket/participant id.

## 9. Voice colours, if 6-8 isn't enough

Per-model hues are spread so the 8 most recent speakers stay >=38° apart; 6
always fit, usually 7-8 (`config/voices.ts`, `utils/voice.ts`). If busier
rooms need more, add lightness as a second channel (needs `--voice-l` offset
in `index.css`). Greens/teals look closer in the light theme (sRGB gamut
clipping at L 50%), so check there first.
