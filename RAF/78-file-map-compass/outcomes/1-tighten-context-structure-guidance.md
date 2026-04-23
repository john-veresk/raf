# Outcome: Tighten Context Structure Guidance

Updated RAF's shared prompt contract so planning and amend guidance now describe shared project context with `## Project Files` and reserve `## Key Decisions` for durable domain-level decisions. Aligned the README, prompt-viewer sample data, and regression coverage with that contract, and replaced stale generated-context tests with read-only `context.md` coverage that matches the current runtime.

## Key Changes
- Updated [src/prompts/shared.ts](/Users/eremeev/.raf/worktrees/RAF/78-file-map-compass/src/prompts/shared.ts) to rename `## Relevant Files` guidance to `## Project Files`, require concrete file-path entries with inspect-if-relevant instructions, and narrow `## Key Decisions` semantics.
- Updated [README.md](/Users/eremeev/.raf/worktrees/RAF/78-file-map-compass/README.md), [prompt-viewer/generate.mjs](/Users/eremeev/.raf/worktrees/RAF/78-file-map-compass/prompt-viewer/generate.mjs), and regenerated [prompt-viewer/prompts-data.js](/Users/eremeev/.raf/worktrees/RAF/78-file-map-compass/prompt-viewer/prompts-data.js) so docs and fixtures match the prompt contract.
- Updated [tests/unit/planning-prompt.test.ts](/Users/eremeev/.raf/worktrees/RAF/78-file-map-compass/tests/unit/planning-prompt.test.ts), [tests/unit/amend-prompt.test.ts](/Users/eremeev/.raf/worktrees/RAF/78-file-map-compass/tests/unit/amend-prompt.test.ts), and [tests/unit/project-context.test.ts](/Users/eremeev/.raf/worktrees/RAF/78-file-map-compass/tests/unit/project-context.test.ts) to assert the new wording and the current read-only `context.md` lifecycle.

## Decision Updates
None.

## Notes
- Ran `npm install` in this worktree because `node_modules` was absent and `npm run build` could not find `tsc`.
- Verified the change with `npm test -- --runTestsByPath tests/unit/planning-prompt.test.ts tests/unit/amend-prompt.test.ts tests/unit/project-context.test.ts`.

<promise>COMPLETE</promise>
