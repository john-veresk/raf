# Project Decisions

## Should `--all` apply only to the human-readable list output and leave `--json` unchanged, with the new config key controlling only the plain-text default limit?
Yes, human-readable only. Keep `raf status --json` unchanged and always return the full project list.

## Should the new default status-list setting stay top-level or introduce a new config section?
Introduce a `display` group.

## Should this task formalize the `display` group broadly and include the existing `showCacheTokens` setting in scope, or keep scope narrow and add only the new status-list limit key under `display`?
Formalize the `display` group, but remove `showCacheTokens` from the code as stale/dead config surface.

## Should the new `display` limit and `raf status --all` continue to affect only the main project list, or should they also apply to the `Worktrees:` section?
Only the main project list. Leave the `Worktrees:` section unchanged.

## For the new `display` config key, should unlimited use `0`, `null`, or both?
Use `0` only as the unlimited value.
