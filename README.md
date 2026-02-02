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
- **Git Integration**: Automatic commits after each completed task
- **Task Dependencies**: Tasks can depend on other tasks, with automatic blocking on failure

## Commands

### `raf plan`

Opens your `$EDITOR` to write a project description, then Claude will interview you and create detailed task plans.

```bash
raf plan              # Create a new project
raf plan my-feature   # Create with a specific name
raf plan --amend 3    # Add tasks to existing project #3
```

### `raf do`

Execute project tasks. Without arguments, shows a picker to select a pending project.

```bash
raf do                # Interactive picker
raf do 3              # Execute project #3
raf do my-project     # Execute by name
raf do 3 4 5          # Execute multiple projects
```

### `raf status`

Check project status.

```bash
raf status            # List all projects
raf status 3          # Show details for project #3
```

## Status Symbols

```
○  pending     - task not yet started
✓  completed   - task finished successfully
✗  failed      - task failed
⊘  blocked     - task blocked by failed dependency
```

## Project Structure

RAF creates a `./RAF/` folder with numbered project directories:

```
./RAF/
├── 001-auth-system/
│   ├── input.md           # Your original intent (raw prompt)
│   ├── decisions.md       # Design decisions from planning
│   ├── plans/             # Generated task plans
│   ├── outcomes/          # Execution results
│   └── logs/              # Debug logs (on failure)
└── 002-dashboard/
    └── ...
```

## Command Reference

### `raf plan [projectName]`

| Option | Description |
|--------|-------------|
| `--amend <id>` | Add tasks to existing project |
| `-y, --auto` | Skip permission prompts (runs in dangerous mode) |

### `raf do [projects...]`

| Option | Description |
|--------|-------------|
| `-t, --timeout <min>` | Timeout per task (default: 60) |
| `-f, --force` | Re-run all tasks regardless of status |
| `-d, --debug` | Save all logs and show debug output |
| `-m, --model <name>` | Claude model (sonnet, haiku, opus) |
| `--sonnet` | Shorthand for `--model sonnet` |

Alias: `raf act`

> **Note:** `raf do` and `raf plan -y` run Claude with `--dangerously-skip-permissions` for fully automated execution without interactive prompts.

### `raf status [identifier]`

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

## License

MIT
