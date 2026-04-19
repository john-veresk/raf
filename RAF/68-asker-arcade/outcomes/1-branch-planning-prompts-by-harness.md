Implemented harness-specific planning interview instructions so planning and amend prompts now emit `AskUserQuestion` for Claude and `request_user_input` for Codex without changing the surrounding workflow, project-path interpolation, or amendment rules.

Key changes:
- Updated `src/commands/plan.ts` to pass the active model harness into both `getPlanningPrompt(...)` and `getAmendPrompt(...)`.
- Added a shared `getInterviewInstructions(...)` helper in `src/prompts/shared.ts` so planning and amend prompts reuse the same harness-specific wording.
- Updated `src/prompts/planning.ts` and `src/prompts/amend.ts` to consume the shared helper while defaulting to Claude for backward compatibility.
- Expanded `tests/unit/planning-prompt.test.ts` and `tests/unit/amend-prompt.test.ts` to assert both Claude and Codex prompt variants, including the Codex-specific `request_user_input` interaction guidance.

Verification:
- `npm test -- --runInBand tests/unit/planning-prompt.test.ts tests/unit/amend-prompt.test.ts`
- `npm run lint`

Notes:
- I installed dependencies with `npm ci` in this worktree because `jest` and `tsc` were not initially available.

<promise>COMPLETE</promise>
