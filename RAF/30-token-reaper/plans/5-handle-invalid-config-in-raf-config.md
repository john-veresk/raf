# Task: Handle invalid config gracefully in raf config command

## Objective
Make `raf config` resilient to invalid or corrupt config files so it can serve as the recovery path for broken configurations.

## Context
In `src/commands/config.ts`, the command calls `getModel('config')` and `getEffort('config')` early in execution. These read from the resolved config, which requires loading and validating `~/.raf/raf.config.json`. If that file contains invalid JSON or fails schema validation, these calls throw and `raf config` exits immediately — blocking the user from using the interactive editor to fix their config. Since `raf config` is the intended way to edit config, it must survive a broken config file.

## Requirements
- Wrap the config-loading path in `raf config` with error handling that catches JSON parse errors and schema validation failures
- On error, warn the user with a visible message (e.g., "Config file has errors, using defaults") that includes the specific error
- Fall back to default config values for model and effort so the interactive session can launch
- The interactive Claude session should still receive the current (broken) config file contents as context, so the user can see and fix the issue
- Only apply this resilience to `raf config` — other commands should continue to fail fast on invalid config
- Cover the error-handling path with tests

## Implementation Steps
1. In `src/commands/config.ts`, wrap the `getModel('config')` and `getEffort('config')` calls in a try-catch
2. On catch, log a warning with the error details and fall back to the default model/effort values from `DEFAULT_CONFIG`
3. Ensure the rest of the command continues normally — the interactive session launches with defaults
4. Make sure the broken config file contents are still shown to Claude in the session prompt so the user can diagnose and fix
5. Add tests for the error-recovery path (invalid JSON, schema validation failure)

## Acceptance Criteria
- [ ] `raf config` launches successfully even when `~/.raf/raf.config.json` is invalid JSON
- [ ] `raf config` launches successfully even when config fails schema validation
- [ ] A clear warning is displayed to the user about the config error
- [ ] The interactive session uses default model/effort values as fallback
- [ ] The broken config content is still visible in the session for the user to fix
- [ ] Other commands (`raf plan`, `raf do`, `raf status`) still fail fast on invalid config
- [ ] All tests pass

## Notes
- Check whether `loadConfig()` or the individual `getModel()`/`getEffort()` accessors are the right place to catch — it may be cleaner to catch at the `loadConfig()` level and return defaults
- The post-session validation already checks for config errors after the session ends — this change handles the pre-session path
- Consider whether `raf config --reset` also needs this fix (it probably doesn't since reset deletes the file without loading it)
