# Task 001 - Completed

## Summary
## Task Completed
All acceptance criteria have been met:
1. ✅ `/decisions` folder is created when a new project is created - Added `getDecisionsDir()` function to `paths.ts` and updated `project-manager.ts` to create the folder during project creation
2. ✅ Planning prompt instructs Claude to save Q&A pairs - Added "Step 2.5: Record Decisions" to the planning prompt with clear instructions
3. ✅ Format follows Markdown Q&A list structure - The prompt specifies the format with `## [Question asked]` followed by `[User's answer]`
4. ✅ Existing tests pass - All 114 tests pass
5. Manual test can be performed by running `raf plan` to verify DECISIONS.md is created with Q&A content (depends on Claude following the prompt)
Changes made:
- `src/utils/paths.ts:98-100` - Added `getDecisionsDir()` function
- `src/core/project-manager.ts:11` - Added import for `getDecisionsDir`
- `src/core/project-manager.ts:51` - Added creation of decisions directory
- `src/prompts/planning.ts:44-60` - Added Step 2.5 with instructions for recording decisions
<promise>COMPLETE</promise>

## Details
- Attempts: 1
- Completed at: 2026-01-30T16:01:13.696Z

