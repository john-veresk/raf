# Task: Fix and Improve PR Description Generation

## Objective
Fix the `\n` escaping bug in PR descriptions, filter out log noise, switch to Sonnet model, and restructure the PR body for clarity.

## Context
PR descriptions currently have multiple issues:
1. **Newlines rendered as literal `\n`** — Root cause: `pull-request.ts` line 421 uses `.replace(/\n/g, '\\n')` when building the `gh pr create --body` shell command, which turns real newlines into literal `\n` strings
2. **Log output leaking into PR body** — Claude CLI stdout may include warning/log lines mixed with the actual response
3. **Haiku produces low-quality summaries** — Should use Sonnet for better PR descriptions
4. **PR body structure needs improvement** — Should have: proofread summary from input.md, key decisions from decisions.md, clear outline of what was done

## Requirements
- Fix the `\n` escaping bug by writing the PR body to a temp file and using `gh pr create --body-file` instead of inline `--body`
- Filter Claude CLI output to remove any non-markdown log lines (console warnings, progress indicators, etc.)
- Change the model from `haiku` to `sonnet` in `callClaudeForPrBody()`
- Restructure the prompt to produce this format:
  - **Summary**: Proofread, clean version of the project requirements from input.md
  - **Key Decisions**: Most important design choices extracted from decisions.md (not all, just significant ones)
  - **What Was Done**: Clear outline of completed work from outcomes
  - **Test Plan**: How to verify the changes
- Clean up the temp file after PR creation

## Dependencies
01

## Implementation Steps
1. In `createPullRequest()`, write the generated PR body to a temp file and use `--body-file <path>` flag instead of `--body "<escaped>"`. Clean up the temp file after the `gh` command completes
2. In `callClaudeForPrBody()`, change `--model haiku` to `--model sonnet`
3. In `callClaudeForPrBody()`, add output filtering to strip non-markdown lines from Claude's stdout (lines that look like log output, warnings, or progress indicators)
4. In `generatePrBody()`, rewrite the prompt template to instruct Claude to produce the new structured format: Summary (from input.md), Key Decisions (from decisions.md), What Was Done (from outcomes), Test Plan
5. Update the fallback body in `generateFallbackBody()` to match the new structure
6. Update tests for PR body generation, temp file handling, and the new prompt structure

## Acceptance Criteria
- [ ] PR body contains proper newlines (not literal `\n`) when viewed on GitHub
- [ ] No log/warning output appears in PR descriptions
- [ ] Sonnet model is used for body generation
- [ ] PR body follows the new 4-section structure: Summary, Key Decisions, What Was Done, Test Plan
- [ ] Temp file is cleaned up after PR creation (even on error)
- [ ] Fallback body matches new structure
- [ ] All tests pass

## Notes
- The `gh pr create --body-file` flag reads the body from a file, completely avoiding shell escaping issues
- Use `os.tmpdir()` and a unique filename for the temp file
- For output filtering: Claude CLI sometimes outputs lines starting with warning symbols or `console.warn` markers — strip anything that doesn't look like markdown content
- The prompt should emphasize that only the MOST important decisions should be included, not every Q&A pair
- `src/core/pull-request.ts` is the main file to modify
- Increase the timeout from 60s since Sonnet is slower than Haiku
