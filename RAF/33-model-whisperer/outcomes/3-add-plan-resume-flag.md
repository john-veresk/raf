# Task 03 - Add --resume flag to raf plan for continuing planning sessions

## Summary

Successfully implemented `raf plan --resume <project>` flag that launches Claude's interactive session picker from the correct CWD (worktree or main repo), enabling users to resume interrupted planning sessions.

## Key Changes Made

### 1. Added `runResume()` method to ClaudeRunner (`src/core/claude-runner.ts:367-425`)
- New method similar to `runInteractive()` but simplified for session resumption
- Launches `claude --resume --model <model>` with TTY passthrough
- No system prompt or user message injection (minimal approach)
- Accepts `cwd` option to control where Claude looks for sessions
- Same PTY setup and cleanup logic as `runInteractive()`

### 2. Updated plan command interface (`src/commands/plan.ts:54-60`)
- Added `resume?: string` field to `PlanCommandOptions` interface
- Added `--resume <identifier>` option to the command definition (line 73)
- Option accepts project identifier (base26 ID, project name, or full folder name)

### 3. Implemented `runResumeCommand()` function (`src/commands/plan.ts:698-779`)
- Validates environment before proceeding
- Resolves project identifier using `resolveProjectIdentifierWithDetails()`
- Determines correct CWD for session resume:
  - Checks for worktree existence in `~/.raf/worktrees/<repo-basename>/<project-folder>/`
  - Validates worktree if found, uses it as CWD
  - Falls back to main repo project path if no worktree or invalid worktree
- Launches `claudeRunner.runResume()` with resolved CWD
- Post-session: lists plan files to show project state
- Handles errors: ambiguous project names, project not found, invalid worktrees

### 4. Updated command routing logic (`src/commands/plan.ts:74-101`)
- Added check for `options.resume` before amend and normal plan flows
- Resume flow has early return, skipping all normal plan setup
- Routing order: resume → amend → normal plan

## Implementation Details

- **CWD resolution**: Ensures Claude session picker finds the right sessions
  - For worktree projects: uses `~/.raf/worktrees/<repo-basename>/<project-folder>/`
  - For non-worktree projects: uses `<repo-root>/RAF/<project-folder>/`
- **Model parameter**: Resume sessions use the configured planning model via `--model` flag
- **Session picker**: Claude CLI's `--resume` flag without session ID opens interactive picker
- **No validation workaround**: When worktree is invalid, falls back gracefully to main repo
- **Post-session feedback**: Shows plan count and lists plan files after session ends

## Test Results

All tests pass: **1251 tests passed** (50 test suites)

TypeScript build succeeds with no errors.

## Verification

All acceptance criteria met:
- ✅ `raf plan --resume <project>` launches Claude's interactive session picker
- ✅ Correct CWD used for worktree projects (sessions discoverable)
- ✅ Correct CWD used for non-worktree projects
- ✅ Normal plan flow (project creation, input) skipped when `--resume` is used
- ✅ Plan file checking still runs after session ends
- ✅ Error message shown when project not found
- ✅ ClaudeRunner has `runResume()` method for minimal session resume

## Usage Examples

```bash
# Resume by base26 ID
raf plan --resume ahwqwq

# Resume by project name
raf plan --resume model-whisperer

# Resume by full folder name
raf plan --resume ahwqwq-model-whisperer

# Short flag
raf plan -r ahwqwq
```

## Notes

- The `--resume` flag is mutually exclusive with normal plan creation and `--amend`
- When multiple projects have the same name, user is prompted to specify the ID or full folder name
- Worktree detection is automatic - user doesn't need to specify `--worktree` with `--resume`
- Claude's session picker will show sessions created in that CWD (worktree or main repo)

<promise>COMPLETE</promise>
