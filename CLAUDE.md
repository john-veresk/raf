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
├── commands/                # CLI commands (plan, do, status, config)
├── core/                    # Core business logic
├── prompts/                 # System prompts for Claude
│   └── config-docs.md       # Full config reference (used by raf config)
├── parsers/                 # Output parsing utilities
├── utils/                   # Utility functions
└── types/                   # TypeScript type definitions
```

## RAF Project Structure

Each RAF project follows this structure:
```
RAF/
└── abcdef-project-name/    # 6-char epoch-based base26 ID (a-z only)
    ├── input.md             # User requirements
    ├── decisions.md         # Q&A from planning interviews
    ├── plans/               # Task breakdowns
    │   ├── 01-task-name.md  # 2-char base36 task ID
    │   └── 02-another-task.md
    └── outcomes/            # Completed task results
        ├── 01-task-name.md
        └── 02-another-task.md
```

### Plan File Structure

Each plan file MUST have Obsidian-style frontmatter at the top, before the `# Task:` heading:
```markdown
effort: medium
---
# Task: [Task Name]

## Objective
[Clear, one-sentence description]

## Context
[Why this task is needed]

## Dependencies
[Optional - comma-separated task IDs, e.g., "01, 02"]
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

**Frontmatter**:
- Uses Obsidian-style format: `key: value` lines followed by `---` (no opening delimiter)
- `effort` is REQUIRED: `low`, `medium`, or `high` — determines execution model via `effortMapping`
- `model` is OPTIONAL: explicit model override (subject to ceiling)
- Frontmatter is parsed by `src/utils/frontmatter.ts`

**Dependencies Section**:
- Optional - omit if task has no dependencies
- Uses task IDs only (e.g., `01, 02`)
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

### Configurable by Default
- If a feature or setting can be configurable, it should be configurable through the config system
- Built-in defaults in `DEFAULT_CONFIG` (`src/types/config.ts`) provide sensible out-of-the-box behavior
- Global config at `~/.raf/raf.config.json` overrides defaults
- CLI flags override config values
- Three-tier precedence: **CLI flag > global config > built-in defaults**
- When adding new features, add corresponding config keys to the schema

### Configuration System
- **Config file**: `~/.raf/raf.config.json` (optional — missing file uses all defaults)
- **Schema** (defined in `src/types/config.ts`):
  - `models.*` — Claude model per scenario (`execute`, `plan`, `nameGeneration`, `failureAnalysis`, `prGeneration`, `config`)
  - `effortMapping.*` — maps task effort labels (`low`, `medium`, `high`) to models
  - `timeout` — task timeout in seconds
  - `maxRetries` — max retry attempts per task
  - `autoCommit` — whether Claude auto-commits on task completion
  - `worktree` — default worktree mode for plan/do commands
  - `syncMainBranch` — sync main branch with remote before worktree/PR operations (default: true)
  - `commitFormat.*` — commit message templates (`task`, `plan`, `amend`, `prefix`)
- **Validation**: strict — unknown keys rejected at every nesting level (`src/utils/config.ts`)
- **Deep-merge**: partial overrides merge with defaults (only specify keys you want to change)
- **Helper accessors**: `getModel()`, `getEffortMapping()`, `resolveEffortToModel()`, `getModelTier()`, `applyModelCeiling()`, `getCommitFormat()`, `getCommitPrefix()`, `getTimeout()`, `getMaxRetries()`, `getAutoCommit()`, `getWorktreeDefault()`, `getSyncMainBranch()` (all in `src/utils/config.ts`)
- **Full reference**: `src/prompts/config-docs.md` (also serves as system prompt for `raf config`)

### Per-Task Model Resolution
- Plan files contain `effort` frontmatter that determines which model executes the task
- `effortMapping` config maps effort labels to models: `{ low: "haiku", medium: "sonnet", high: "opus" }`
- `models.execute` acts as a ceiling — tasks can't exceed this model tier
- On retry, tasks escalate to the ceiling model for a better chance of success
- If a plan has no effort frontmatter, `models.execute` is used as a fallback (with a warning)

### `raf config` Command
- `raf config` — launches interactive Claude session for viewing/editing config
- `raf config "use haiku for name generation"` — session with initial prompt
- `raf config --reset` — deletes config file after confirmation prompt
- Session uses config documentation as system prompt and shows current config state
- Post-session validation checks the config file for errors and warns on issues
- Implementation: `src/commands/config.ts`

### Project Naming Convention
- Format: `XXXXXX-project-name` where `XXXXXX` is a 6-character base26 ID (a-z only)
- ID is generated from `(current_unix_seconds - RAF_EPOCH)` encoded as base26, left-padded with 'a' to 6 characters
- Base26 encoding: a=0, b=1, ..., z=25 (lowercase letters only, no digits)
- RAF_EPOCH is 2026-01-01T00:00:00Z (Unix timestamp 1767225600)
- Project name is kebab-case derived from core feature
- IDs are unique by timestamp and sort chronologically
- Project IDs are visually distinct from task IDs (which use base36 with digits)

### Task ID Format
- Task IDs are 2-character base36 strings, zero-padded (e.g., `01`, `0a`, `1z`, `zz`)
- Base36 charset: 0-9, a-z (lowercase)
- Supports up to 1296 tasks per project (00-zz)
- Task numbering starts at `01` (not `00`)
- Sort order: 00, 01, ..., 09, 0a, 0b, ..., 0z, 10, 11, ..., zz
- Utilities in `src/utils/paths.ts`: `encodeTaskId()`, `decodeTaskId()`, `TASK_ID_PATTERN`
- File naming: `01-task-name.md`, `0a-task-name.md`, etc.

### Project Identifier Resolution
Support multiple identifier formats in commands:
1. Base26 ID: `abcdef` (6-character epoch-based ID, a-z only)
2. Project name: `fix-stuff` (case-insensitive, partial match)
3. Full folder name: `abcdef-fix-stuff` (exact match)

Use `resolveProjectIdentifierWithDetails()` from `src/utils/paths.ts`

### Token Usage Tracking
- After each task, RAF displays a per-task token summary (input/output tokens, cache tokens, estimated cost)
- After all tasks complete, RAF displays a grand total summary block
- Token data comes from Claude's `--output-format stream-json --verbose` result events
- Cost calculation uses configurable per-model pricing (`pricing.*` config keys)
- `TokenTracker` class (`src/utils/token-tracker.ts`) accumulates usage across tasks
- Formatting utilities in `src/utils/terminal-symbols.ts`: `formatTaskTokenSummary()`, `formatTokenTotalSummary()`, `formatNumber()`, `formatCost()`
- Failed tasks with partial usage data are still tracked in totals
- Tasks with no usage data (timeout, crash) are silently skipped

### Git Commit Schema

All git commits are made by Claude during task execution. RAF does not create any automated commits.

**Commit format** is configurable via `commitFormat.*` config keys. The default templates use `{placeholder}` syntax:
- `commitFormat.task`: `"{prefix}[{projectId}:{taskId}] {description}"` — task completion commits
- `commitFormat.plan`: `"{prefix}[{projectId}] Plan: {projectName}"` — plan commits
- `commitFormat.amend`: `"{prefix}[{projectId}] Amend: {projectName}"` — amendment commits
- `commitFormat.prefix`: `"RAF"` — prefix token used in all templates

Default output example:
```
RAF[abcdef:01] Add validation for user input fields
RAF[abcdef:02] Fix null pointer in auth handler
```

- Claude commits code changes and outcome file together in one commit per task
- No commits on failure (changes are stashed instead)
- Handle "not in git repo" gracefully (warning, no crash)
- Template rendering: `renderCommitMessage()` in `src/utils/config.ts`

### Amendment Mode
- `raf plan --amend <identifier>` adds tasks to existing projects
- Existing tasks shown with status: `[COMPLETED]`, `[PENDING]`, `[FAILED]`
- New tasks numbered sequentially after last task
- No modification of existing plan files

### Worktree Mode
- `raf plan --worktree` and `raf do --worktree` run in an isolated git worktree
- Worktree path: `~/.raf/worktrees/<repo-basename>/<project-id>` (e.g., `~/.raf/worktrees/myapp/abcdef-my-feature`)
- Branch name matches the project folder name (e.g., `abcdef-my-feature`)
- `--worktree` flag is required on `plan`; on `do` it is auto-detected when a worktree project is selected from the picker
- `raf do` without arguments auto-discovers pending worktree projects and merges them into the project picker
  - Worktree projects are labeled with `[worktree]` suffix in the picker
  - Selecting a worktree project automatically enables worktree mode (post-action picker, worktree cwd)
  - Projects are deduplicated: when a folder exists in both local and worktree, the worktree version is shown
  - Mixed local and worktree projects are sorted chronologically
- `raf status` automatically discovers and displays worktree projects (no flag needed)
  - List mode: worktree projects that differ from main repo shown under `Worktrees:` header
  - Single project mode: shows both main and worktree state when they differ
  - Identical worktree projects are hidden; worktree-only projects always shown
- Lifecycle: create worktree -> plan in worktree -> pick post-action -> execute in worktree -> auto-run chosen action
- **Post-execution picker**: Before task execution, an interactive picker asks what to do after tasks complete:
  1. **Merge** — merge branch into original branch (fast-forward preferred, merge-commit fallback)
  2. **Create PR** — push branch and create a GitHub PR (uses `createPullRequest()` from `pull-request.ts`)
  3. **Leave branch** — do nothing, keep the branch as-is
- PR option runs preflight checks immediately; falls back to "leave" if `gh` CLI is missing or unauthenticated
- On task failure, the chosen post-action is skipped with a message
- Worktree cleanup: all post-actions (merge, PR, leave) clean up the worktree directory (branch preserved in git)
- On failure, worktree is kept for inspection
- `raf plan --amend --worktree` auto-recreates the worktree when it was cleaned up:
  - If the branch exists (common after cleanup): recreates worktree from the existing branch
  - If no branch exists: creates a fresh worktree and copies project files from the main repo
- On plan failure with no plan files created, the worktree is cleaned up automatically
- Core utilities in `src/core/worktree.ts`: `createWorktree()`, `createWorktreeFromBranch()`, `branchExists()`, `validateWorktree()`, `mergeWorktreeBranch()`, `removeWorktree()`, `listWorktreeProjects()`
- Post-execution picker: `pickPostExecutionAction()` and `PostExecutionAction` type exported from `src/commands/do.ts`

### PR Creation from Worktree
- `src/core/pull-request.ts` provides `createPullRequest()` to create GitHub PRs from worktree branches
- Requires `gh` CLI installed and authenticated (`gh auth login`)
- Auto-detects base branch (from `refs/remotes/origin/HEAD`, falling back to `main`/`master`)
- PR title derived from project name (kebab-case to human-readable)
- PR body generated by Claude Haiku summarizing input.md, decisions.md, and outcomes
- Falls back to simple body if Claude is unavailable
- Auto-pushes branch to origin if not already pushed
- Preflight checks: `prPreflight()` validates gh CLI, authentication, GitHub remote
- Key functions: `createPullRequest()`, `prPreflight()`, `generatePrBody()`, `generatePrTitle()`, `detectBaseBranch()`


## PR Review

When reviewing a PR or addressing PR comments, use `gh` CLI to read PR details:

```bash
# View PR description and metadata
gh pr view <number>

# View PR diff
gh pr diff <number>

# View review comments (inline code comments)
gh api repos/{owner}/{repo}/pulls/<number>/comments

# View PR review summaries
gh api repos/{owner}/{repo}/pulls/<number>/reviews

# View general PR conversation comments (non-inline)
gh api repos/{owner}/{repo}/issues/<number>/comments

# List PR files changed
gh pr diff <number> --name-only

# View PR checks/CI status
gh pr checks <number>
```

### Checking Out PR Branches

PR branches are often checked out in git worktrees. Before creating a new checkout, check for existing worktrees:

```bash
# List existing worktrees
git worktree list

# Find the branch name from the PR
gh pr view <number> --json headRefName -q .headRefName

# If gh is rate-limited, list remote branches to find it
git ls-remote --heads origin

# Check if branch is already in a worktree (look for the path in worktree list output)
# If it is, work directly in that worktree path (e.g., /Users/eremeev/.raf/worktrees/Paperi/<branch>)
# If not, checkout normally:
git fetch origin <branch> && git checkout <branch>
```

When working in a worktree, use absolute paths to the worktree directory for all file operations and builds.

## Important Reminders

1. **Keep README.md updated** — Update the user-facing README when:
   - A new CLI command is added (add usage section + Command Reference entry)
   - Existing command flags or behavior change
   - Important features are added (e.g., worktrees, config, token tracking)
   - The Features list needs a new bullet point
2. **Keep CLAUDE.md updated** — Update internal docs when architectural decisions, config keys, or conventions change
3. Cover changes with tests - use TDD approach
4. Use Clean Architecture principles (SOLID)
