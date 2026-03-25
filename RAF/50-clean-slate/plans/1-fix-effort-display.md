---
effort: low
---
# Task: Fix effort display in task status line

## Objective
Only show reasoning effort in task status output when `reasoningEffort` is actually configured in the model entry, and display the config value (not the frontmatter label).

## Context
Currently the status line always shows the frontmatter effort label (e.g. "low") alongside the model name: `● 1-pen-size-adjustment (sonnet, low) 1m 5s`. When `reasoningEffort` is not set in the effortMapping config, this is misleading — it should just show `(sonnet)`. When it IS set, it should show the actual reasoningEffort value from the config (e.g. `(sonnet, medium)`).

## Requirements
- When `modelResolution.entry.reasoningEffort` is falsy, `currentEffort` should be `undefined` so nothing is displayed
- When `modelResolution.entry.reasoningEffort` is truthy, display that value (not `task.frontmatter?.effort`)
- The `formatResolvedTaskModel` function in `do.ts` already uses `entry.reasoningEffort` — this change makes the status line consistent with that

## Implementation Steps
1. In `src/commands/do.ts`, change line ~859 from:
   ```ts
   currentEffort = task.frontmatter?.effort;
   ```
   to:
   ```ts
   currentEffort = modelResolution.entry.reasoningEffort;
   ```
   This single change fixes both problems: it uses the config's reasoningEffort value, and when it's undefined/falsy, nothing gets displayed.

## Acceptance Criteria
- [ ] When effortMapping entry has no `reasoningEffort`, status shows `(sonnet)` not `(sonnet, low)`
- [ ] When effortMapping entry has `reasoningEffort: "medium"`, status shows `(sonnet, medium)`
- [ ] Change applies to running, completed, and failed task status lines (all share `currentEffort`)

## Notes
- This is a one-line change in `src/commands/do.ts:859`
- The `formatModelMetadata` function in `terminal-symbols.ts` already handles falsy effort correctly (only pushes to parts array `if (options.effort)`)
