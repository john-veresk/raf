# RAF

Node.js CLI tool that orchestrates task planning and execution via Claude Code CLI.

**Stack**: Node.js 20+, TypeScript (strict), ESM, Commander.js, node-pty, Jest

## Commands

```bash
npm run build      # Compile TypeScript
npm run dev        # Watch mode
npm test           # Run tests
npm run lint       # Type check without emit
```

## Code Style

- IMPORTANT: Always use `.js` extension in imports (e.g., `import { foo } from './bar.js'`) — TypeScript resolves `.ts` files but ESM requires `.js`
- Use named exports only (no default exports)
- Write tests first (TDD) — unit tests for core modules, integration tests for command flows

## Project Structure

```
src/
├── index.ts          # CLI entry point
├── commands/         # CLI commands (plan, do, status, config)
├── core/             # Core business logic
├── prompts/          # System prompts for Claude
├── parsers/          # Output parsing
├── utils/            # Utilities
└── types/            # TypeScript type definitions
```

## RAF Domain Model

Each RAF project lives in a folder named `XXXXXX-project-name` where `XXXXXX` is a 6-char base26 ID (a-z only, epoch-derived). Task IDs are 2-char base36 (0-9, a-z), starting at `01`.

```
RAF/
└── abcdef-project-name/
    ├── input.md          # User requirements
    ├── decisions.md      # Q&A from planning interviews
    ├── plans/            # Task breakdowns (01-task-name.md, 02-another.md)
    └── outcomes/         # Completed task results (matching filenames)
```

### Plan File Format

Plan files MUST have YAML frontmatter with `effort` before the `# Task:` heading:

```markdown
---
effort: medium
---
# Task: [Task Name]

## Objective
## Context
## Dependencies        (optional — comma-separated task IDs like "01, 02")
## Requirements
## Implementation Steps
## Acceptance Criteria
## Notes
```

`effort` is REQUIRED (`low`/`medium`/`high`) — determines execution model. `model` is optional (explicit override, subject to ceiling).

### State Derivation

Task status is derived, not persisted. Check outcome file existence and content:
- Complete: outcome ends with `<promise>COMPLETE</promise>`
- Failed: outcome ends with `<promise>FAILED</promise>`
- Pending: no outcome file

See `src/core/state-derivation.ts` for implementation.

### Commit Format

Commits follow configurable templates using `{placeholder}` syntax:
```
RAF[abcdef:01] Add validation for user input fields    # task commit
RAF[abcdef] Plan: project-name                          # plan commit
RAF[abcdef] Amend: project-name                         # amend commit
```

One commit per task (code + outcome file together). No commits on failure (changes stashed).

### Configuration

- File: `~/.raf/raf.config.json` (optional — missing = all defaults)
- Precedence: **CLI flag > config file > built-in defaults**
- New features should be configurable — add keys to `DEFAULT_CONFIG` in `src/types/config.ts`
- Validation is strict: unknown keys rejected at every nesting level
- Full config reference: @src/prompts/config-docs.md

### Worktree Mode

`--worktree` flag runs planning/execution in isolated git worktrees at `~/.raf/worktrees/<repo>/<project-id>`. Branch name = project folder name. See `src/core/worktree.ts` for utilities.

### Amendment Mode

`raf plan --amend <identifier>` adds tasks to existing projects. New tasks numbered sequentially after last task. Existing plans are never modified.

## When Changing Code

- IMPORTANT: Keep README.md updated when adding/changing CLI commands, flags, or features
- IMPORTANT: Keep this CLAUDE.md updated when architectural decisions or conventions change
- When updating CLAUDE.md, keep it lean: only add what would cause mistakes if missing. Never add function names, file locations discoverable from code, generic coding advice, or implementation details. Use `@path` imports for detailed references instead of inlining.
- When working in a worktree, use absolute paths for all file operations and builds
