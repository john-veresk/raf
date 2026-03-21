# Project Decisions

## For `raf config --get/--set`: Should `--get` with no key show the full merged config (defaults + overrides), or only user overrides from the config file?
Full merged config — Shows the complete resolved config with all defaults filled in, so users see every active setting.

## For `raf config --set`: Should setting a value to its default automatically remove it from the config file (keeping config minimal), or always write explicitly?
Remove if default — If the value matches the default, remove the key from the config file to keep it clean.

## For the diverged main branch fix: Should callers treat this as a hard error or a warning?
Warning only — Show a visible warning (yellow) but continue execution. Stale base is better than blocking work.

## For the name generation fix: Should the fix tighten the prompt, add response parsing, or both?
Prompt only — Just improve the prompt instructions to be more explicit about output format.

## For `raf config --get models.plan`: Should the output be plain value only or formatted?
Plain value — Just print 'opus'. Easy to pipe into other commands.

## For the token investigation task: Research only or plan fix now?
Research now and create task if needed — investigated and found it's a display issue: `input_tokens` from Claude API only reports non-cached tokens. Fix plan created as task 07 to show total input in display.

## Token investigation findings
Root cause: Claude API separates `input_tokens` (non-cached, e.g. 3-22) from `cache_read_input_tokens` (e.g. 18,000+) and `cache_creation_input_tokens` (e.g. 6,000+). RAF displays only non-cached as "X in". Fix: sum all three for the display. Cost calculation is already correct.

## For amend commit fix: Should plan files be removed from the commit or committed separately?
Remove from commit — Only commit input.md and decisions.md during planning. Plan files get committed by Claude during execution.

## For syncing worktree branch with main before execution: Rebase or merge?
Rebase onto main — Cleaner history, replays worktree commits on top of latest main.

## If the rebase has conflicts, should `raf do` abort or skip sync?
Skip sync and warn — Skip the sync step, show a warning, and continue execution on the current branch state.

## For removing token report from plan: Should `session-parser.ts` and its tests be deleted or kept?
Delete session-parser entirely — Remove session-parser.ts and its test file since they have no other consumers.

## Should the `sessionId` parameter be removed from `runInteractive()` in claude-runner.ts?
Remove sessionId from runInteractive() too — Clean up the runner API as well since no other callers pass sessionId.
