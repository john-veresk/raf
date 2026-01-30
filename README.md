# RAF - Automated Task Planning & Execution with Claude Code

RAF is a CLI tool that orchestrates task planning and execution using Claude Code CLI.

## Features

- **Interactive Planning**: Claude interviews you to break down complex tasks
- **Smart Project Naming**: Auto-generates descriptive project names using Claude Haiku
- **Automated Execution**: Execute plans with retry logic and progress tracking
- **Resume Support**: Continue from where you left off after interruption
- **Git Integration**: Automatic commits after each completed task

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

### Execute Plans

```bash
raf do <projectName>
```

Options:
- `--timeout <minutes>` - Override default 60-minute timeout
- `--verbose` - Show full Claude output
- `--debug` - Save all logs

### Check Status

```bash
raf status <projectName>
```

Shows task list with status badges:
- `[ ]` pending
- `[~]` in progress
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
