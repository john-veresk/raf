# Task: Show Model Name at Task Start

## Objective
Log the Claude model name once when task execution begins during the "do" phase.

## Status: COMPLETED

## Implementation Summary

Added functionality to display the Claude model name at the start of task execution, providing transparency about which model is being used.

### Changes Made

1. **src/utils/config.ts**
   - Added `getClaudeSettingsPath()` function to get the path to Claude CLI settings file (`~/.claude/settings.json`)
   - Added `getClaudeModel()` function that reads the model from Claude CLI settings
   - Returns `null` gracefully if settings file doesn't exist or model is not specified

2. **src/commands/do.ts**
   - Added import for `getClaudeModel` from config module
   - Added model logging at task start: `Using model: {model-name}`
   - Only logs if model is successfully detected

3. **tests/unit/config.test.ts** (new file)
   - Unit tests for `getClaudeSettingsPath()`
   - Comprehensive tests for `getClaudeModel()`:
     - Returns model name from settings
     - Returns full model name if specified
     - Returns null if settings file doesn't exist
     - Returns null if model not specified
     - Returns null if settings file is invalid JSON
     - Uses default settings path when not provided

### Example Output

```
[INFO] Executing project: my-project
[INFO] Tasks: 3, Timeout: 30 minutes
[INFO] Using model: opus
```

## Acceptance Criteria

- [x] Model name logged at start of each task
- [x] Format: `Using model: {model-name}`
- [x] Logged only once per task, not repeated
- [x] Graceful handling if model can't be detected (returns null, no log)
- [x] All tests pass (177 tests passing)

## Version

Updated package.json version from 0.2.5 to 0.2.6
