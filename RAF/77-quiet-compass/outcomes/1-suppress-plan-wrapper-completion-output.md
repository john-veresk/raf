Implemented the `raf plan` and `raf plan --amend` wrapper change so successful interactive sessions no longer print RAF-authored completion summaries or next-step instructions after the planning runner exits.

Key changes made:
- Updated `src/commands/plan.ts` to remove the success-only post-session summary/listing/handoff logs for fresh planning and amend flows.
- Kept the existing non-zero exit warnings, empty-plan warnings, failure handling, and empty-project cleanup behavior intact.
- Added regression coverage in `tests/unit/plan-command-auto-flag.test.ts` for successful plan and amend sessions that create plan files, asserting the duplicate wrapper output does not reappear.
- Updated `README.md` so the `raf plan` section states that the planning harness prints the final handoff instructions.

## Decision Updates
None.

Important notes:
- `raf plan --resume` was left unchanged as requested.
- Local dependencies were installed with `npm ci` in this worktree so the requested verification could run.
- Verification run: `npm test -- --runTestsByPath tests/unit/plan-command-auto-flag.test.ts` and `npm run lint`.

<promise>COMPLETE</promise>
