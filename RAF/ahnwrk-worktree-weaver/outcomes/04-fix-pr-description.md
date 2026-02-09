# Outcome: Fix and Improve PR Description Generation

## Summary

Fixed the `\n` escaping bug in PR descriptions, added output filtering, switched to Sonnet model, and restructured the PR body to a 4-section format.

## Key Changes

- **`src/core/pull-request.ts`**:
  - Added `import * as os from 'node:os'` for temp file path generation
  - **`createPullRequest()`**: Replaced inline `--body` with `--body-file` using a temp file written via `fs.writeFileSync()`, with cleanup in a `finally` block (even on error)
  - **`callClaudeForPrBody()`**: Changed `--model haiku` to `--model sonnet`; applied `filterClaudeOutput()` to strip log noise from Claude's stdout
  - **`generatePrBody()`**: Increased default timeout from 60s to 120s; rewrote prompt template to produce 4-section structure: Summary, Key Decisions, What Was Done, Test Plan
  - **`generateFallbackBody()`**: Updated to produce the same 4-section structure with placeholder content
  - **`filterClaudeOutput()`** (new, exported): Strips non-markdown lines from Claude output (warning emojis, `[warn]`/`[info]` prefixes, `console.warn`, `Note:`, `Loading`/`Connecting`/`Processing` lines, progress indicators)
  - Updated JSDoc comments to reflect Sonnet usage

- **`tests/unit/pull-request.test.ts`**:
  - Added mocks for `node:os` (`tmpdir`), `fs.writeFileSync`, `fs.unlinkSync`
  - Added `filterClaudeOutput` to imports
  - Added 10 new tests for `filterClaudeOutput` (clean markdown passthrough, warning emoji removal, `[warn]` prefix, `console.warn`, `Note:` lines, Loading/Connecting/Processing, progress indicators, empty input, all-log input, blank line preservation)
  - Added 3 new tests for `createPullRequest` (verifying `--body-file` usage, temp file cleanup on success, cleanup on failure)
  - Added 2 new tests for `generatePrBody` (4-section prompt structure verification, sonnet model verification)
  - Updated 2 existing `generatePrBody` tests to check for all 4 sections

## Test Results

All 960 tests pass (45 suites).

<promise>COMPLETE</promise>
