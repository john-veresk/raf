# RAF - Automated Task Planning & Execution with Claude Code

[![npm version](https://img.shields.io/npm/v/raf.svg)](https://www.npmjs.com/package/raf)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

RAF is a CLI tool that orchestrates task planning and execution using Claude Code CLI.

**GitHub:** [https://github.com/john-veresk/raf](https://github.com/john-veresk/raf)

## Features

- **Interactive Planning**: Claude interviews you to break down complex tasks
- **Smart Project Naming**: Auto-generates descriptive project names using Claude Haiku
- **Automated Execution**: Execute plans with retry logic and progress tracking
- **Resume Support**: Continue from where you left off after interruption
- **Git Integration**: Automatic commits after each completed task
- **Multi-Project Execution**: Run multiple projects in sequence

## Installation

```bash
npm install -g raf
```

## Requirements

- Node.js 20+
- Claude Code CLI installed and configured

## Usage

### Plan a Project

```bash
raf plan [projectName]
```

Opens your `$EDITOR` to write a project description, then Claude will:
1. Identify 3-8 distinct tasks
2. Interview you about each task
3. Create detailed plan files

To add tasks to an existing project:

```bash
raf plan --amend <identifier>
```

### Execute Plans

```bash
raf do <projects...>
```

Execute one or more projects. Accepts project identifiers in multiple formats:

```bash
raf do my-project           # By name
raf do 3                    # By number
raf do 001-my-project       # By folder name
raf do 3 4 5                # Multiple projects
```

Options:
- `-t, --timeout <minutes>` - Timeout per task (default: 60)
- `-v, --verbose` - Show full Claude output
- `-d, --debug` - Save all logs and show debug output
- `-f, --force` - Re-run all tasks regardless of status

### Check Status

```bash
raf status [identifier]
```

Without an identifier, lists all projects with their status. With an identifier, shows detailed task list:

```bash
raf status              # List all projects
raf status my-project   # Show details for a project
raf status 3            # By project number
raf status --json       # Output as JSON
```

Status badges:
- `[ ]` pending
- `[x]` completed
- `[!]` failed

Project status badges:
- `[P]` planning
- `[R]` ready
- `[~]` executing
- `[x]` completed
- `[!]` failed

## Project Structure

RAF creates a `./RAF/` folder with numbered project directories:

```
./RAF/
├── 001-auth-system/
│   ├── input.md           # Your original description
│   ├── decisions.md       # Design decisions from planning
│   ├── plans/             # Generated task plans
│   ├── outcomes/          # Execution results
│   └── logs/              # Debug logs (on failure)
└── 002-dashboard/
    └── ...
```

## License

MIT
