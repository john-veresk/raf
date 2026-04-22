# Project Decisions

## How broad should the new `fast` field be in the schema?
Codex only. Add `fast?` to `ModelEntry`, document it as Codex-specific, and reject or ignore it on Claude entries.

## Which Codex paths should RAF apply `fast` to?
All Codex runs.

## Where should `fast` be allowed in config?
All entries. Allow it on both `models.*` and `effortMapping.*` because they share the same `ModelEntry` shape.

## How should RAF handle `fast: true` on a Claude model entry?
Reject it. Treat `fast` as Codex-only and fail validation on Claude entries so the schema stays explicit.

## Should this feature also change user-visible model displays?
Show everywhere. Append `fast` in planning and execution model/status displays when enabled.

## How should `raf do` display fast-mode tasks in console logs?
Include the mode in compact task lines, for example: `● 3-restore-grid-context-menu-card-anchors (gpt-5.4, medium, fast) 19m 41s`.
