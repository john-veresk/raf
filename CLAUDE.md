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
```
RAF[<project-number>:plan]      - After planning phase completes
RAF[<project-number>:outcome]   - After all tasks complete
RAF[<project-number>:<task>]    - Claude commits during task execution
```
- Only stage project folder, not entire repo
- No commits on failure
- Handle "not in git repo" gracefully (warning, no crash)

### Amendment Mode
- `raf plan --amend <identifier>` adds tasks to existing projects
- Existing tasks shown with status: `[COMPLETED]`, `[PENDING]`, `[FAILED]`
- New tasks numbered sequentially after last task
- No modification of existing plan files

### Multi-Project Execution
- `raf do <projects...>` supports multiple projects
- Sequential execution (not parallel) for git safety
- Continue on failure, report results at end
- Deduplicates repeated projects

## Important Reminders

1. After task completion update README.md (user facing) and CLAUDE.md (internal)
2. Cover changes with tests - use TDD approach
3. Use Clean Architecture principles (SOLID)