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

## Key Implementation Details

### node-pty Usage
- Required for real TTY interaction with Claude's AskUserQuestionTool
- Use `setRawMode(true)` for interactive planning mode
- Graceful cleanup on process termination

### State Management
- State stored in `state.json` per project
- Support resuming from last completed task
- Track attempts for retry logic

### Output Parsing
- Look for `<promise>COMPLETE</promise>` or `<promise>FAILED</promise>` markers
- Detect context overflow patterns
- Parse task completion status

## Version Management

Use npm's version command to bump the version following Semantic Versioning:

### Version Types

| Command | When to Use | Example |
|---------|-------------|---------|
| `npm version patch` | Bug fixes, minor changes | 0.2.7 → 0.2.8 |
| `npm version minor` | New features, backwards compatible | 0.2.7 → 0.3.0 |
| `npm version major` | Breaking changes | 0.2.7 → 1.0.0 |

### Version Bump Example

```bash
# Bump patch version (bug fixes)
npm version patch

# Bump minor version (new features)
npm version minor

# Bump major version (breaking changes)
npm version major
```

### Important
After task completion update README.md (user facing) and CLAUDE.md (internal)
Run appropriate npm version command on feature completiong  
Cover your changes with tests. Use TDD approach
Use Clean Architecture principles (SOLID)