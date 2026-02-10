# RAF - Automated Task Planning & Execution with Claude Code

[![npm version](https://img.shields.io/npm/v/raf.svg)](https://www.npmjs.com/package/raf)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

RAF is a CLI tool that orchestrates task planning and execution using Claude Code CLI.

**GitHub:** [https://github.com/john-veresk/raf](https://github.com/john-veresk/raf)

## Vision

Good software of the future will be built with good decisions by humans, not AI. RAF is software that builds other software by capitalizing on human ability to **make choices** and take ownership.

## Why RAF?

**Human decisions matter** — RAF focuses on interviewing you during planning. Right questions lead to right decisions, and right decisions lead to better software.

**Better reviews** — Review the intent, decisions, plan and outcomes, not AI generated code.

**Context rot** — Long AI sessions lose focus and make mistakes. RAF splits work into small, focused tasks that Claude executes one at a time with fresh context.

**Reliable execution** — Modern LLMs are remarkably capable when given clear instructions. A well-crafted plan yields working solutions reliably. RAF helps you build good plans.

**Save on tokens** — Less back-and-forth during debugging saves tokens, even with planning overhead.

## Quick Start

```bash
# Install
npm install -g raf

# Plan a project - Claude will interview you and create a detailed plan
raf plan

# Execute the plan
raf do
```

That's it! RAF will guide you through breaking down your task and then execute it step by step.

## Requirements

- Node.js 20+
- Claude Code CLI installed and configured

## Features

- **Interactive Planning**: Claude interviews you to break down complex tasks into 3-8 distinct tasks
- **Automated Execution**: Execute plans with retry logic and progress tracking
- **Resume Support**: Continue from where you left off after interruption
- **Git Integration**: Automatic commits after each completed task
- **Task Dependencies**: Tasks can depend on other tasks, with automatic blocking on failure
- **Worktree Mode**: Isolate planning and execution in a git worktree branch with `--worktree`
- **Configurable**: Customize models, effort levels, timeouts, and more via `raf config`

## Commands

### `raf plan`

Opens your `$EDITOR` to write a project description, then Claude will interview you and create detailed task plans.

```bash
raf plan              # Create a new project
raf plan my-feature   # Create with a specific name
raf plan --amend abcdef  # Add tasks to existing project
raf plan --worktree   # Plan in an isolated git worktree
```

### `raf do`

Execute project tasks. Without arguments, shows a picker to select a pending project.

```bash
raf do                # Interactive picker
raf do abcdef         # Execute by project ID
raf do my-project     # Execute by name
raf do --worktree     # Pick and execute a worktree project
raf do my-feature -w --merge  # Execute in worktree, merge on success
```

Note: In non-verbose mode, the completion summary reflects the tasks executed in that run (the remaining tasks at start), so the elapsed time maps to those tasks.

### `raf status`

Check project status. Worktree projects are discovered automatically when inside a git repo — no flag needed.

```bash
raf status            # List all projects (includes worktree projects that differ)
raf status abcdef     # Show details for a project (shows both main and worktree if they differ)
```

### `raf config`

View and edit RAF configuration through an interactive Claude session. Configuration is stored at `~/.raf/raf.config.json`. All settings are optional — only set what you want to change.

```bash
raf config               # Interactive config editor
raf config "use haiku for name generation"  # Start with a specific request
raf config --reset       # Reset config to defaults
```

**Precedence**: CLI flags > config file > built-in defaults

Example `~/.raf/raf.config.json`:

```json
{
  "models": {
    "execute": "sonnet",
    "nameGeneration": "haiku"
  },
  "worktree": true,
  "timeout": 45
}
```

Run `raf config` without arguments and ask what's available — the session has full knowledge of every configurable option.

### `raf migrate-project-ids-base26`

Rename legacy project folders (3-char base36 or 6-char base36 with digits) to the current 6-char base26 format.

```bash
raf migrate-project-ids-base26             # Migrate project folders in ./RAF/
raf migrate-project-ids-base26 --dry-run   # Preview renames without executing
raf migrate-project-ids-base26 --worktree  # Migrate worktree project folders
```

## Status Symbols

```
○  pending     - task not yet started
●  running     - task currently executing
✓  completed   - task finished successfully
✗  failed      - task failed
⊘  blocked     - task blocked by failed dependency
```

## Project Structure

RAF creates a `./RAF/` folder with project directories identified by epoch-based base26 IDs (a-z only):

```
./RAF/
├── abcdef-auth-system/
│   ├── input.md           # Your original intent (raw prompt)
│   ├── decisions.md       # Design decisions from planning
│   ├── plans/             # Generated task plans
│   ├── outcomes/          # Execution results
│   └── logs/              # Debug logs (on failure)
└── abaaba-dashboard/
    └── ...
```

## Worktree Mode

Worktree mode runs planning and execution in an isolated git worktree, keeping your main branch clean while RAF works on a separate branch.

### Basic workflow

```bash
# Plan in a worktree (creates branch and worktree directory)
raf plan my-feature --worktree

# Execute tasks in the worktree, merge back on success
raf do my-feature --worktree --merge
```

### How it works

- `--worktree` creates a git worktree at `~/.raf/worktrees/<repo>/<project>/` with a new branch named after the project folder (e.g., `abcdef-my-feature`)
- All planning artifacts, code changes, and commits happen in the worktree branch
- `--merge` on `raf do` merges the branch back after all tasks succeed (fast-forward preferred, merge commit as fallback)
- On merge conflicts, the merge is aborted and you get instructions for manual resolution
- If tasks fail, the worktree branch is preserved for inspection
- Worktrees persist after completion — clean them up manually with `git worktree remove` when done

## Command Reference

### `raf plan [projectName]`

| Option | Description |
|--------|-------------|
| `--amend <id>` | Add tasks to existing project |
| `-y, --auto` | Skip permission prompts (runs in dangerous mode) |
| `-w, --worktree` | Create a git worktree for isolated planning |

### `raf do [project]`

| Option | Description |
|--------|-------------|
| `-t, --timeout <min>` | Timeout per task (default: 60) |
| `-f, --force` | Re-run all tasks regardless of status |
| `-d, --debug` | Save all logs and show debug output |
| `-m, --model <name>` | Claude model (sonnet, haiku, opus) |
| `--sonnet` | Shorthand for `--model sonnet` |
| `-w, --worktree` | Execute tasks in a git worktree |
| `--merge` | Merge worktree branch after successful completion (requires `--worktree`) |

Alias: `raf act`

### `raf migrate-project-ids-base26`

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview renames without executing |
| `-w, --worktree` | Migrate worktree project folders |

> **Note:** `raf do` and `raf plan -y` run Claude with `--dangerously-skip-permissions` for fully automated execution without interactive prompts.

### `raf config [prompt]`

| Option | Description |
|--------|-------------|
| `--reset` | Reset config file to defaults |

### `raf status [identifier]`

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

## License

MIT
