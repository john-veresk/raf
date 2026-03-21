---
effort: medium
---
# Task: Research and wire fast mode for Codex harness

## Objective
Determine if the Codex CLI supports fast mode, and either wire it up or remove fast mode from Codex config paths entirely.

## Context
The config wizard says "RAF only applies fast mode on Claude runners" and config-docs.md states "Codex does not support fast mode." The user wants to know if this is actually true, and if Codex does support fast mode, wire it. If not, clean up by removing the fast setting from Codex-related paths rather than just warning.

## Requirements
- Research whether `codex exec` supports any fast mode flag (check `codex --help`, `codex exec --help`, or similar)
- If supported: wire `fast: true` in `CodexRunner` similar to how `ClaudeRunner` does it
- If NOT supported:
  - Update `config-docs.md` to clarify fast mode is Claude-only (already says this - verify)
  - Consider if validation should warn/strip `fast: true` from codex harness entries
  - Update the config wizard prompt/docs to reflect this clearly

## Implementation Steps
1. Run `codex --help` and `codex exec --help` (or equivalent) to check for fast mode flags
2. Search the codex-runner.ts for any existing fast mode references
3. Based on findings:
   - **If supported**: Add fast mode flag to `CodexRunner.run()` and `CodexRunner.runInteractive()` similar to `ClaudeRunner`
   - **If NOT supported**:
     - Verify config-docs.md accurately reflects this
     - Add validation in `src/utils/config.ts` that warns if `fast: true` is set with codex harness
     - Update any config wizard messaging

## Acceptance Criteria
- [ ] Fast mode either works with Codex or is explicitly unsupported with clear messaging
- [ ] Config validation warns if user sets fast: true on a codex harness entry
- [ ] config-docs.md is accurate
- [ ] TypeScript compiles without errors
