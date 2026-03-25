# Outcome: Fix effort display in task status line

## Summary

One-line fix in `src/commands/do.ts` to use the config's `reasoningEffort` value in the status line instead of the frontmatter effort label.

## Changes Made

- `src/commands/do.ts:859`: Changed `currentEffort = task.frontmatter?.effort` to `currentEffort = modelResolution.entry.reasoningEffort`

## Result

- When effortMapping entry has no `reasoningEffort`, status now shows `(sonnet)` instead of `(sonnet, low)`
- When effortMapping entry has `reasoningEffort: "medium"`, status shows `(sonnet, medium)`
- Consistent with `formatResolvedTaskModel` which already used `entry.reasoningEffort`

<promise>COMPLETE</promise>
