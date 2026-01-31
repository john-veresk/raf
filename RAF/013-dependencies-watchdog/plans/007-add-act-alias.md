# Task: Add 'act' Alias for 'do' Command

## Objective
Add 'act' as a complete alias for the 'raf do' command, allowing users to run `raf act` instead of `raf do`.

## Context
Some users may prefer the command name "act" over "do" as it's more descriptive ("take action on tasks"). This is a simple UX improvement that adds choice without changing any behavior.

## Requirements
- `raf act` should be identical to `raf do` in all respects
- All options and arguments must work exactly the same
- Help text should show `act` as an alias of `do`

## Implementation Steps
1. Open `src/commands/do.ts`
2. Add `.alias('act')` to the command definition chain (after `.description()`)
3. Verify the alias works by building and testing manually

## Acceptance Criteria
- [ ] `raf act <project>` executes tasks just like `raf do <project>`
- [ ] `raf act --help` shows the same options as `raf do --help`
- [ ] All flags (`-m`, `--sonnet`, `-y`, `--retries`, etc.) work with `raf act`
- [ ] `raf --help` shows `act` as an alias or separate command

## Notes
Commander.js provides the `.alias()` method which makes this a one-line change.
