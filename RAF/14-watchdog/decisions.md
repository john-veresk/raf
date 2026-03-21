# Project Decisions

## For --amend after project name, should the syntax be `raf plan <identifier> --amend` (flag is boolean, identifier is the positional argument)?
Support both syntaxes - Support both `raf plan --amend <id>` and `raf plan <id> --amend`

## For the details section, what exactly should be removed from successful outcomes?
Remove entire `## Details` section - No metadata at all on success (no attempts, elapsed time, or timestamp)

## When a task succeeds after prior failures (retry), should the `## Failure History` section still be included in the outcome?
~~Keep failure history on success after retries~~ REVISED: Move failure history to console output at end of `raf do`

## Where should the failure history be moved to?
Console output at end of `raf do` - Show failure history in the terminal summary, not in outcome files

## When should failure history appear in console output?
For any task that had retries - Show retry history even for tasks that eventually succeeded after failures
