# Task: Fix Name Generation to Not Register Sessions

## Objective
Replace `execSync("claude --print ...")` in name generation with a spawn-based approach using `--no-session-persistence` to prevent sessions from being saved to disk.

## Context
Project name generation (`src/utils/name-generator.ts`) currently uses `execSync()` to call `claude --model X --print "prompt"`. This registers a session in Claude's session history, cluttering the user's session list with throwaway name generation calls. The `--no-session-persistence` CLI flag prevents this.

## Requirements
- Replace `execSync` with `spawn` from `child_process` (same approach as `claude-runner.ts`)
- Use `-p` flag for non-interactive print mode
- Add `--no-session-persistence` flag to prevent session registration
- Do NOT use `--dangerously-skip-permissions` (not needed for simple text generation)
- Keep the same timeout behavior (30 seconds)
- Keep the same fallback behavior on failure
- The functions are already `async` so switching to spawn is natural

## Implementation Steps
1. In `src/utils/name-generator.ts`, replace `execSync` calls in `callSonnetForName()` and `callSonnetForMultipleNames()` with async `spawn`-based execution
2. Add `--no-session-persistence` to the CLI arguments
3. Collect stdout from the spawned process and return it as the result
4. Handle errors and timeouts the same way as before (return null/empty on failure)
5. Update tests to reflect the new spawn-based approach

## Acceptance Criteria
- [ ] Name generation no longer uses `execSync`
- [ ] `--no-session-persistence` flag is passed to Claude CLI
- [ ] Sessions from name generation do not appear in `claude --resume` picker
- [ ] Name generation still works correctly (produces valid kebab-case names)
- [ ] Fallback to generated names works when Claude CLI fails
- [ ] All existing tests pass

## Notes
- The `--no-session-persistence` flag is documented in Claude CLI reference: "Disable session persistence so sessions are not saved to disk and cannot be resumed (print mode only)"
- Consider using a small helper function for spawn-based CLI calls since this pattern could be reused
- Current `escapeShellArg()` won't be needed with spawn (arguments passed as array, not shell string)
