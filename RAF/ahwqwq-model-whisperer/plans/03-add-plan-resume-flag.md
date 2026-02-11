---
effort: medium
---
# Task: Add --resume flag to raf plan for continuing planning sessions

## Objective
Add a `--resume <project>` flag to `raf plan` that launches Claude's interactive session picker (`claude -r`) from the correct worktree CWD, enabling users to resume interrupted planning sessions.

## Context
Planning sessions are persisted by Claude CLI as `.jsonl` files under `~/.claude/projects/<path-key>/`. However, worktree planning sessions are stored under the worktree path key, not the main repo path. Running `claude -r` from the main repo doesn't find these sessions. RAF needs a `--resume` flag that resolves the correct worktree path for a project and launches Claude's session picker from there.

## Requirements
- New flag: `raf plan --resume <project-identifier>` (accepts base26 ID, project name, or full folder name)
- Resolve the project's worktree path using existing project resolution utilities
- Launch `claude -r` (interactive resume picker) from the worktree CWD
- Minimal approach: just pass `--resume` to Claude CLI, no system prompt injection
- If the project is not a worktree project, launch from the project's directory in the main repo
- If no worktree path exists and the project used worktree mode, show helpful error

## Dependencies
01

## Implementation Steps

1. **Add `--resume` option to plan command** in `src/commands/plan.ts`:
   - Add `.option('--resume <identifier>', 'Resume a planning session for an existing project')` to the commander setup
   - When `--resume` is provided, skip all normal plan setup (project creation, input gathering, etc.)

2. **Resolve project path**:
   - Use `resolveProjectIdentifierWithDetails()` from `src/utils/paths.ts` to find the project
   - Check for worktree path: look up `~/.raf/worktrees/<repo-basename>/<project-folder>/`
   - If worktree exists, use that as CWD
   - If no worktree, use the project path in the main repo as CWD
   - If neither exists, error with helpful message

3. **Launch Claude with `--resume`**:
   - Add a new method to `ClaudeRunner` or use `pty.spawn` directly: launch `claude -r` (or `claude --resume`) from the resolved CWD
   - Pass `--model` flag to match the planning model
   - Do NOT pass `--append-system-prompt` or user message (minimal resume)
   - Use the same TTY passthrough setup as `runInteractive()`

4. **Add `runResume` method to `ClaudeRunner`** in `src/core/claude-runner.ts`:
   - Similar to `runInteractive` but with simpler args: just `['--resume', '--model', this.model]`
   - Same pty.spawn, stdin/stdout passthrough, cleanup logic
   - Accept `cwd` option for worktree path

5. **Update plan command flow** in `src/commands/plan.ts`:
   - Early return path when `--resume` is detected
   - Resolve project, find CWD, launch `runResume()`
   - After session ends, run the same plan file checking logic as normal plan

6. **Update tests** (if plan-command tests exist):
   - Test that `--resume` skips project creation
   - Test that correct CWD is resolved for worktree projects

## Acceptance Criteria
- [ ] `raf plan --resume <project>` launches Claude's interactive session picker
- [ ] Correct CWD used for worktree projects (sessions discoverable)
- [ ] Correct CWD used for non-worktree projects
- [ ] Normal plan flow (project creation, input) skipped when `--resume` is used
- [ ] Plan file checking still runs after session ends
- [ ] Error message shown when project not found
- [ ] ClaudeRunner has `runResume()` method for minimal session resume

## Notes
- `resolveProjectIdentifierWithDetails()` in `src/utils/paths.ts` handles all identifier formats
- Worktree paths follow the pattern: `~/.raf/worktrees/<repo-basename>/<project-folder>/`
- `listWorktreeProjects()` in `src/core/worktree.ts` can help discover worktree projects
- Claude CLI's `-r` flag without a session ID opens an interactive picker showing sessions for the CWD
- The `--model` flag should still be passed to ensure the resume session uses the configured planning model
