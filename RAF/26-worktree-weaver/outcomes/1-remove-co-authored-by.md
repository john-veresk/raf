# Outcome: Remove Co-Authored-By from Commit Messages

## Summary

Added explicit instructions to the execution prompt telling Claude not to add Co-Authored-By or any other trailers to commit messages, ensuring commits use only the single-line `RAF[project:task] description` format.

## Key Changes

- **`src/prompts/execution.ts`** (lines 100-101): Added two bullet points to the commit instruction section:
  - "The commit message must be a SINGLE LINE -- no body, no trailers"
  - "Do NOT add Co-Authored-By or any other trailers to the commit message"
- **`tests/unit/execution-prompt.test.ts`**: Added 2 new test cases:
  - Verifies the prompt contains the no-trailers instruction
  - Verifies the prompt specifies single-line commit format

## Test Results

All 45 tests pass (43 existing + 2 new).

<promise>COMPLETE</promise>
