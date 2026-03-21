# RAF - Automated Task Planning & Execution

[![npm version](https://img.shields.io/npm/v/raf.svg)](https://www.npmjs.com/package/raf)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

RAF is a CLI tool that orchestrates task planning and execution using Claude Code CLI or OpenAI Codex CLI.

**GitHub:** [https://github.com/john-veresk/raf](https://github.com/john-veresk/raf)

## Vision

Good software of the future will be built with good decisions by humans, not AI. RAF is software that builds other software by capitalizing on human ability to **make choices** and take ownership.

## Why RAF?

**Smart model selection** — RAF estimates task complexity during planning (low/medium/high effort) and automatically routes each task to the appropriate model. Simple tasks use cheaper, faster models; complex tasks get the most capable model. Fully configurable via `effortMapping`.

**Automatic PR creation** — In worktree mode, RAF can automatically create GitHub PRs with Claude-generated descriptions that summarize your original intent, key decisions made during planning, and task outcomes. Reviewers get meaningful context, not boilerplate.

**Structured decision-making** — The planning interview captures design decisions as reviewable artifacts (`decisions.md`). These persist alongside the code and give reviewers insight into the "why" behind changes.

**Context isolation** — Each task executes with fresh context. No context rot, no degradation from long sessions. The plan provides all the context the model needs.

**Token efficiency** — Focused, well-planned tasks avoid the back-and-forth debugging cycles that burn tokens. Planning overhead pays for itself.

**Full auditability** — Every project preserves its input, decisions, plans, and outcomes as plain markdown. You can review the entire thought process, not just the final code.

**Retry with escalation** — Failed tasks automatically retry with a more capable model, maximizing success rate without manual intervention.

**Git worktree isolation** — Work happens on isolated branches without touching your working directory. Merge, PR, or leave — your choice after execution.

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
- Or: OpenAI Codex CLI installed and configured (set provider per-model in config)

## Features

- **Interactive Planning**: Interviews you to break down complex tasks into structured plans
- **Smart Execution**: Automatic model selection, retry with escalation, and progress tracking
- **Multi-Provider**: Use Claude Code CLI or OpenAI Codex CLI via per-model config
- **Resume & Amend**: Continue interrupted sessions or extend existing projects
- **Git Integration**: Automatic commits, worktree isolation, and PR generation
- **Task Dependencies**: Dependency tracking with automatic blocking on failure
- **Full Configurability**: Customize models, effort mappings, timeouts, and more via `raf config`

## Commands

### `raf plan`

Opens your `$EDITOR` to write a project description, then Claude will interview you and create detailed task plans.

```bash
raf plan              # Create a new project
raf plan my-feature   # Create with a specific name
raf plan --amend abcdef  # Add tasks to existing project
```

#### `--amend` vs `--resume`

- **`--amend <id>`**: Adds new tasks to an existing project. Opens a new planning session that sees existing tasks (with their status) and creates additional plans numbered after the last task. Use when scope grows or you want to extend a completed project.

- **`--resume <id>`**: Resumes an interrupted Claude planning session. Opens Claude's session picker scoped to the project directory so you can continue exactly where you left off. Use when your planning session was interrupted (Ctrl-C, network issue, etc.) and you want to continue the conversation.

### `raf do`

Execute project tasks. Without arguments, shows a picker to select a pending project.

```bash
raf do                # Interactive picker (includes worktree projects)
raf do abcdef         # Execute by project ID
raf do my-project     # Execute by name
```

Note: In non-verbose mode, the completion summary reflects the tasks executed in that run (the remaining tasks at start), so the elapsed time maps to those tasks.

### `raf status`

Check project status. Worktree projects are discovered automatically when inside a git repo — no flag needed.

```bash
raf status            # List all projects (includes worktree projects that differ)
raf status abcdef     # Show details for a project (shows both main and worktree if they differ)
```

### `raf preset`

Save, load, list, and delete named config presets. Presets are complete copies of your config stored in `~/.raf/presets/`.

```bash
raf preset save claude-setup    # Save current config as "claude-setup"
raf preset load claude-setup    # Restore "claude-setup" (overwrites current config)
raf preset list                 # Show all saved presets
raf preset delete claude-setup  # Remove a preset
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
    "execute": { "model": "sonnet", "provider": "claude" },
    "nameGeneration": { "model": "haiku", "provider": "claude" }
  },
  "worktree": true,
  "timeout": 45
}
```

Run `raf config` without arguments and ask what's available — the session has full knowledge of every configurable option.

## Provider Configuration

RAF supports multiple LLM providers per scenario. Each model entry in `models` and `effortMapping` specifies its own `provider`, so you can mix Claude and Codex freely:

```json
{
  "models": {
    "plan": { "model": "opus", "provider": "claude" },
    "execute": { "model": "gpt-5.4", "provider": "codex" }
  },
  "effortMapping": {
    "low": { "model": "sonnet", "provider": "claude" },
    "high": { "model": "gpt-5.4", "provider": "codex" }
  }
}
```

**Codex limitations:**
- `--resume` is not supported (Codex CLI has no session resume)
- System prompt is prepended to the user message rather than passed separately

## Status Symbols

```
○  pending     - task not yet started
●  running     - task currently executing
✓  completed   - task finished successfully
✗  failed      - task failed
⊘  blocked     - task blocked by failed dependency
```

## Project Structure

RAF creates a `./RAF/` folder with project directories identified by sequential numeric IDs:

```
./RAF/
├── 1-auth-system/
│   ├── input.md           # Your original intent (raw prompt)
│   ├── decisions.md       # Design decisions from planning
│   ├── plans/             # Generated task plans
│   ├── outcomes/          # Execution results
│   └── logs/              # Debug logs (on failure)
└── 2-dashboard/
    └── ...
```

## Worktree Mode

Worktree mode runs planning and execution in an isolated git worktree, keeping your main branch clean while RAF works on a separate branch.

### Basic workflow

```bash
# Plan in a worktree (enabled via config: "worktree": true)
raf plan my-feature

# Execute tasks in the worktree (auto-detected, no flag needed)
raf do my-feature
```

### Post-execution picker

When running `raf do` in worktree mode, an interactive picker appears **before** task execution asking what to do after tasks complete:

- **Merge into current branch** — Merge the worktree branch back (fast-forward preferred, merge commit fallback)
- **Create a GitHub PR** — Push the branch and create a pull request (requires `gh` CLI)
- **Leave branch as-is** — Do nothing, keep the branch for later

The chosen action only runs if all tasks succeed. On task failure, the action is skipped and the worktree is kept for inspection.

### PR creation

The "Create a GitHub PR" option:

- Requires `gh` CLI installed and authenticated (`gh auth login`)
- Auto-detects the base branch from `origin/HEAD`
- Generates a PR title from the project name
- Uses Claude to summarize your input, decisions, and outcomes into a PR body
- Auto-pushes the branch to origin if needed

If `gh` is missing or unauthenticated, the option falls back to "Leave branch" with a warning.

### How it works

- When `worktree: true` is set in config, `raf plan` creates a git worktree at `~/.raf/worktrees/<repo>/<project>/` with a new branch named after the project folder (e.g., `abcdef-my-feature`)
- All planning artifacts, code changes, and commits happen in the worktree branch
- `raf do` auto-detects whether a project lives in a worktree — no flag needed
- After successful post-actions (merge, PR, or leave), the worktree directory is cleaned up automatically — the git branch is preserved
- On merge conflicts, the merge is aborted and you get instructions for manual resolution
- If tasks fail, the worktree is kept for inspection

## Command Reference

### `raf plan [projectName]`

| Option | Description |
|--------|-------------|
| `--amend <id>` | Add tasks to existing project |
| `-y, --auto` | Skip permission prompts (runs in dangerous mode) |

### `raf do [project]`

| Option | Description |
|--------|-------------|
| `-t, --timeout <min>` | Timeout per task (default: 60) |
| `-f, --force` | Re-run all tasks regardless of status |
| `-d, --debug` | Save all logs and show debug output |

Alias: `raf act`

> **Note:** `raf do` and `raf plan -y` run the CLI with skip-permissions flags for fully automated execution without interactive prompts.

### `raf config [prompt]`

| Option | Description |
|--------|-------------|
| `--reset` | Reset config file to defaults |

### `raf preset <subcommand> [name]`

| Subcommand | Description |
|------------|-------------|
| `save <name>` | Save current config as a named preset |
| `load <name>` | Load a preset (overwrites current config) |
| `list` | List all saved presets |
| `delete <name>` | Delete a preset |

### `raf status [identifier]`

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

## License

MIT
