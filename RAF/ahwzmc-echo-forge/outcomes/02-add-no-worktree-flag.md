# Task Outcome: Add --no-worktree flag to plan and do commands

## Summary

Successfully added `--no-worktree` flag support to both `raf plan` and `raf do` commands, enabling users to override `config.worktree = true` on a per-invocation basis. The implementation uses Commander.js dual option definition pattern to support tri-state flag behavior (true/false/undefined).

## Changes Made

### 1. Command Option Definitions

**src/commands/plan.ts (line 75-76)**:
- Changed from single `--worktree` option to dual option definition
- Added `.option('-w, --worktree', 'Create a git worktree for isolated planning')`
- Added `.option('--no-worktree', 'Disable worktree mode (overrides config)')`

**src/commands/do.ts (line 204-205)**:
- Changed from single `--worktree` option to dual option definition
- Added `.option('-w, --worktree', 'Execute tasks in a git worktree')`
- Added `.option('--no-worktree', 'Disable worktree mode (overrides config)')`

The dual option pattern allows Commander.js to recognize both `--worktree` (sets true) and `--no-worktree` (sets false), while omitting both leaves the value undefined for config fallback.

### 2. Tests

**tests/unit/worktree-flag-override.test.ts** (new file):
- Created comprehensive test suite with 14 passing tests
- Tests Commander.js flag parsing for both `--worktree` and `--no-worktree`
- Tests tri-state behavior (true/false/undefined)
- Tests resolution logic with `options.worktree ?? getWorktreeDefault()`
- Tests override semantics (flag takes precedence over config)

### 3. Documentation

**README.md**:
- Added `--no-worktree` flag to `raf plan` command reference table (line 199)
- Added `--no-worktree` flag to `raf do` command reference table (line 211)
- Added usage note in "Worktree Mode > How it works" section (line 189)

## Implementation Details

### Commander.js Dual Option Pattern

Commander.js v14 does NOT automatically support `--no-*` variants for simple boolean options. The `--[no-]flag` syntax doesn't work as expected. Instead, we used the dual option definition pattern:

```typescript
.option('-w, --worktree', 'Enable worktree mode')
.option('--no-worktree', 'Disable worktree mode')
```

This creates three states:
- `--worktree` → `options.worktree = true`
- `--no-worktree` → `options.worktree = false`
- (omitted) → `options.worktree = undefined`

### Resolution Logic

The existing resolution pattern `options.worktree ?? getWorktreeDefault()` works perfectly:
- Explicit true (from `--worktree`) takes precedence
- Explicit false (from `--no-worktree`) takes precedence
- Undefined (omitted flag) falls back to `getWorktreeDefault()` from config

## Verification

All acceptance criteria met:
- ✅ `raf plan --no-worktree` runs without worktree mode even when `config.worktree = true`
- ✅ `raf do --no-worktree` runs without worktree mode even when `config.worktree = true`
- ✅ `--worktree` still works as before
- ✅ Omitting both flags falls back to config default
- ✅ README documents the new flag
- ✅ Tests cover the tri-state behavior
- ✅ `npm test` passes (all 1257 tests passing)

## Notes

- No changes needed to the resolution logic in plan.ts or do.ts — the existing `options.worktree ?? getWorktreeDefault()` pattern already handles the tri-state correctly
- The implementation is consistent with how other boolean flags work in Commander.js
- Tests use `parseOptions()` instead of `parse()` to avoid running full command actions during unit tests

<promise>COMPLETE</promise>
