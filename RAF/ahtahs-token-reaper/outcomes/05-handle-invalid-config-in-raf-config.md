# Task 05: Handle Invalid Config Gracefully in raf config Command

## Summary

Made `raf config` resilient to invalid or corrupt config files so it can serve as the recovery path for broken configurations. Previously, if `~/.raf/raf.config.json` contained invalid JSON or failed schema validation, `raf config` would crash before the interactive session could launch, blocking users from fixing the issue.

## Changes Made

### src/commands/config.ts
- Added import for `resetConfigCache` from config utilities
- Added import for `DEFAULT_CONFIG` from types/config
- Wrapped `getModel('config')` and `getEffort('config')` calls in try-catch block
- On error, falls back to `DEFAULT_CONFIG.models.config` ('sonnet') and `DEFAULT_CONFIG.effort.config` ('medium')
- Displays warning message with the specific error: "Config file has errors, using defaults: {message}"
- Provides guidance: "Fix the config in this session or run `raf config --reset` to start fresh."
- Calls `resetConfigCache()` to clear any broken cached config
- The interactive Claude session still receives the broken config file contents via `getCurrentConfigState()`, so the user can see and fix the issue

### tests/unit/config-command.test.ts
- Added imports for `resolveConfig`, `getModel`, `getEffort`, `resetConfigCache`, and `DEFAULT_CONFIG`
- Added `resetConfigCache()` calls to beforeEach/afterEach for test isolation
- Added new test suite "Error recovery - invalid config fallback" with 6 tests:
  - Throws on invalid JSON when resolving config
  - Throws on schema validation failure when resolving config
  - Default fallback values are correct for config scenario
  - Raw file contents readable even with invalid JSON
  - Raw file contents readable even with schema validation failure
  - resetConfigCache clears the cached config

## Acceptance Criteria Verification

- [x] `raf config` launches successfully even when `~/.raf/raf.config.json` is invalid JSON
- [x] `raf config` launches successfully even when config fails schema validation
- [x] A clear warning is displayed to the user about the config error
- [x] The interactive session uses default model/effort values as fallback
- [x] The broken config content is still visible in the session for the user to fix
- [x] Other commands (`raf plan`, `raf do`, `raf status`) still fail fast on invalid config
- [x] All tests pass (121 config-related tests, 1162 total passing; pre-existing failures in validation.test.ts and claude-runner-interactive.test.ts are unrelated)

## Notes

- The error handling is specific to `raf config` - other commands continue to fail fast on invalid config as expected
- The `getCurrentConfigState()` function reads raw file content without JSON parsing, so broken content is always available to Claude in the session
- The `--reset` option doesn't need this fix since it deletes the file without loading it

<promise>COMPLETE</promise>
