Updated the amend editor template to show the resolved project identifier derived from the final `projectPath`, so `raf plan --amend` now includes a commented `Project:` line such as `69-amend-whisper`.

Key changes made:
- Updated `src/commands/plan.ts` to derive `path.basename(projectPath)` inside `runAmendCommand()` and pass it into `getAmendTemplate(...)`.
- Extended the amend template comment block to render `# Project: <resolved-folder-name>` above the existing task list while preserving the task summary and next-task-number hint.
- Added a regression test in `tests/unit/plan-command-auto-flag.test.ts` that runs `raf plan 69 --amend` and asserts the editor template contains the resolved identifier, task list header, and numbering hint.

Verification:
- `npm test -- --runInBand tests/unit/plan-command-auto-flag.test.ts`
- `npm run lint`

Notes:
- README changes were not needed because the CLI surface did not change.

<promise>COMPLETE</promise>
