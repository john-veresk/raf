# Project Decisions

## Why was the outcome file being overwritten with a harsh summary?

Claude wrote a comprehensive report during task execution, but RAF's `do.ts` always overwrote the outcome file with `extractSummary()` output after Claude finished. The flow was:
1. Claude wrote comprehensive report to outcome file
2. Claude committed
3. RAF overwrote outcome with summarized content
4. RAF committed (RAF[XXX:outcome])

## Should we preserve Claude's existing outcome file or use terminal output?

Use terminal output - but change approach to have Claude write the outcome file as part of task execution.

## Should Claude write the status tag, or should RAF add it?

Use `<promise>COMPLETE</promise>` marker that Claude already outputs. No need for separate `<status>` tag. State derivation should look for `<promise>` markers in outcome files.

## What should RAF do if Claude forgets to write outcome or writes incorrectly?

Create minimal outcome with status, timestamp, and "No report provided".

## How should failure outcomes be handled?

- RAF creates failure outcomes (not Claude)
- RAF spins up Sonnet to analyze task execution output
- For API errors, limit errors, etc. - generate outcome programmatically
- Sonnet provides structured report: Failure Reason, Analysis, Suggested Fix, Relevant Output
