# RAF - Claude Code Instructions

## Project Overview

RAF (Ralph's Automation Framework) is a Node.js CLI tool that orchestrates task planning and execution using Claude Code CLI.

## Architecture

- **Runtime**: Node.js 20+ with ESM modules
- **Language**: TypeScript (strict mode)
- **CLI Framework**: Commander.js
- **TTY Emulation**: node-pty for interactive Claude sessions
- **Testing**: Jest with ts-jest ESM preset

## Directory Structure

```
src/
├── index.ts                 # CLI entry point
├── commands/                # CLI commands (plan, do, status)
├── core/                    # Core business logic
├── prompts/                 # System prompts for Claude
├── parsers/                 # Output parsing utilities
├── utils/                   # Utility functions
└── types/                   # TypeScript type definitions
```

## RAF Project Structure

Each RAF project follows this structure:
```
RAF/
└── NNN-project-name/        # e.g., 001-fix-bug or a00-feature
    ├── input.md             # User requirements
    ├── decisions.md         # Q&A from planning interviews
    ├── plans/               # Task breakdowns
    │   ├── 001-task-name.md
    │   └── 002-another-task.md
    └── outcomes/            # Completed task results
        ├── 001-task-name.md
        └── 002-another-task.md
```

### Plan File Structure

Each plan file follows this structure:
```markdown
# Task: [Task Name]

## Objective
[Clear, one-sentence description]

## Context
[Why this task is needed]

## Dependencies
[Optional - comma-separated task IDs, e.g., "001, 002"]
[If a dependency fails, this task is blocked]

## Requirements
- Requirement 1
- Requirement 2

## Implementation Steps
1. Step 1
2. Step 2

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Notes
[Additional context]
```

**Dependencies Section**:
- Optional - omit if task has no dependencies
- Uses task IDs only (e.g., `001, 002`)
- If a dependency fails, dependent tasks are automatically blocked

## Development Commands

```bash
npm run build      # Compile TypeScript
npm run dev        # Watch mode compilation
npm test           # Run tests
npm run lint       # Type check without emit
```

## Code Style Guidelines

1. **ESM Modules**: Always use `.js` extension in imports (TypeScript will resolve `.ts` files)
2. **Strict TypeScript**: All code must pass strict type checking
3. **Error Handling**: Use typed errors and handle edge cases explicitly
4. **Async/Await**: Prefer async/await over raw promises
5. **No Default Exports**: Use named exports for better refactoring support

## Testing Requirements

- Unit tests for all core modules
- Integration tests for command flows
- Mock external dependencies (Claude CLI, file system where appropriate)
- Follow TDD approach - write tests first

## Key Implementation Details

### node-pty Usage
- Required for real TTY interaction with Claude's AskUserQuestionTool
- Use `setRawMode(true)` for interactive planning mode
- Graceful cleanup on process termination

### Output Parsing
- Look for `<promise>COMPLETE</promise>` or `<promise>FAILED</promise>` markers
- Detect context overflow patterns
- Parse task completion status

## Architectural Decisions (from completed projects)

### State Derivation Over Persistence
- Task status determined by outcome file existence and content
- Outcome files must end with `<promise>COMPLETE</promise>` or `<promise>FAILED</promise>` marker
- Use `state-derivation.ts` module: `deriveProjectState()`, `getNextPendingTask()`, `isProjectComplete()`

### Outcome File Flow
- Claude writes outcome files during task execution (not RAF)
- RAF validates outcome by checking for completion marker
- If no marker found, RAF generates minimal fallback outcome
- Metadata (attempts, elapsed time, timestamp) appended to outcome

### Failure Analysis
- On task failure, RAF analyzes the failure using Claude Haiku
- Programmatic failures (API errors, timeouts, context overflow) handled without API call
- Failure reports include: Failure Reason, Analysis, Suggested Fix, Relevant Output
- All failure outcomes end with `<promise>FAILED</promise>` marker

### Project Naming Convention
- Format: `NNN-project-name` (001-999) then base36 `XXX-project-name` (a00-zzz)
- Project name is kebab-case derived from core feature
- Supports 46,000+ projects

### Project Identifier Resolution
Support multiple identifier formats in commands:
1. Numeric ID: `3` or `003`
2. Base36 ID: `a00`, `a01`
3. Project name: `fix-stuff` (case-insensitive, partial match)
4. Full folder name: `001-fix-stuff` (exact match)

Use `resolveProjectIdentifierWithDetails()` from `src/utils/paths.ts`

### Git Commit Schema

All git commits are made by Claude during task execution. RAF does not create any automated commits.

**Commit format** (Claude-generated during task execution):
```
RAF[<project-number>:<task>] <description>
```
Claude writes a concise description of what was accomplished, focusing on the actual change rather than the task name.

Examples:
```
RAF[005:001] Add validation for user input fields
RAF[005:002] Fix null pointer in auth handler
RAF[a01:003] Refactor database connection pooling
```

- Claude commits code changes and outcome file together in one commit per task
- No commits on failure (changes are stashed instead)
- Handle "not in git repo" gracefully (warning, no crash)

### Amendment Mode
- `raf plan --amend <identifier>` adds tasks to existing projects
- Existing tasks shown with status: `[COMPLETED]`, `[PENDING]`, `[FAILED]`
- New tasks numbered sequentially after last task
- No modification of existing plan files

### Worktree Mode
- `raf plan --worktree` and `raf do --worktree` run in an isolated git worktree
- Worktree path: `~/.raf/worktrees/<repo-basename>/<project-id>` (e.g., `~/.raf/worktrees/myapp/020-my-feature`)
- Branch name matches the project folder name (e.g., `020-my-feature`)
- `--worktree` flag is required on both `plan` and `do` — it is not auto-detected
- `raf status` automatically discovers and displays worktree projects (no flag needed)
  - List mode: worktree projects that differ from main repo shown under `Worktrees:` header
  - Single project mode: shows both main and worktree state when they differ
  - Identical worktree projects are hidden; worktree-only projects always shown
- Lifecycle: create worktree -> plan in worktree -> execute in worktree -> optionally merge with `--merge`
- Merge strategy: fast-forward preferred, merge-commit fallback, abort on conflicts
- Worktrees are automatically cleaned up after successful completion (branch is preserved for future amend). On failure, worktree is kept for inspection
- `--merge` is only valid with `--worktree`; merges the worktree branch into the original branch after all tasks succeed
- On plan failure with no plan files created, the worktree is cleaned up automatically
- Core utilities in `src/core/worktree.ts`: `createWorktree()`, `validateWorktree()`, `mergeWorktreeBranch()`, `removeWorktree()`, `listWorktreeProjects()`

## Important Reminders

1. After task completion update README.md (user facing) and CLAUDE.md (internal)
2. Cover changes with tests - use TDD approach
3. Use Clean Architecture principles (SOLID)
