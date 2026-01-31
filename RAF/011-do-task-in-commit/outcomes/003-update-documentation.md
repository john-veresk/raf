# Task 003: Update Documentation

## Summary

Updated CLAUDE.md to document the new commit message format where Claude writes meaningful descriptions instead of the fixed project-name + task-name format.

## Changes Made

### File Modified

**CLAUDE.md** - Git Commit Schema section (lines 113-136)

### Documentation Updates

1. **Separated commit types** - Split the schema into two clearly labeled sections:
   - "RAF-generated commits" (fixed format) - for plan and outcome commits
   - "Claude-generated commits" (during task execution) - for task commits

2. **Updated task commit format** - Changed from:
   ```
   RAF[<project-number>:<task>]    - Claude commits during task execution
   ```
   To:
   ```
   RAF[<project-number>:<task>] <description>
   ```

3. **Added explanation** - Added clarification that "Claude writes a concise description of what was accomplished, focusing on the actual change rather than the task name."

4. **Added examples** - Included three realistic commit message examples:
   ```
   RAF[005:001] Add validation for user input fields
   RAF[005:002] Fix null pointer in auth handler
   RAF[a01:003] Refactor database connection pooling
   ```

## Acceptance Criteria Verification

- [x] Git Commit Schema section updated with new format
- [x] Clear explanation that Claude writes the description
- [x] Example provided showing realistic commit message
- [x] Distinction between RAF commits and Claude commits maintained
- [x] No changes to other sections of CLAUDE.md

<promise>COMPLETE</promise>
