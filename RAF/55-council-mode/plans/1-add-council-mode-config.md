---
effort: low
---
# Task: Add councilMode Config

## Objective
Add a `councilMode` boolean config key to RAF's configuration system.

## Context
Council mode is a new planning feature where the planning agent spawns a team of sub-agents to investigate tasks in parallel. This task adds the config plumbing so the feature can be toggled.

## Requirements
- `councilMode` is a simple boolean, default `false`
- Must work with `raf config set councilMode true`
- Must work with `raf.config.json`: `{ "councilMode": true }`

## Implementation Steps

1. **`src/types/config.ts`** — Add `councilMode` to `RafConfig` interface and `DEFAULT_CONFIG`:
   ```typescript
   // In RafConfig interface:
   /** Enable council mode: planning agent spawns a team of sub-agents to investigate tasks in parallel. Default: false */
   councilMode: boolean;

   // In DEFAULT_CONFIG:
   councilMode: false,
   ```

2. **`src/utils/config.ts`** — Add to `VALID_TOP_LEVEL_KEYS`:
   ```typescript
   const VALID_TOP_LEVEL_KEYS = new Set<string>([
     'models', 'effortMapping', 'codex',
     'timeout', 'maxRetries', 'autoCommit',
     'worktree', 'syncMainBranch', 'pushOnComplete', 'commitFormat',
     'rateLimitWaitDefault', 'councilMode',  // ← add here
   ]);
   ```

3. **`src/utils/config.ts`** — Add validation in `validateConfig()` (near other boolean validations like `autoCommit`):
   ```typescript
   if (obj.councilMode !== undefined && typeof obj.councilMode !== 'boolean') {
     warnings.push('councilMode must be a boolean');
   }
   ```

4. **`src/utils/config.ts`** — Add merge logic in `deepMerge()` (near other boolean merges):
   ```typescript
   if (override.councilMode !== undefined) {
     merged.councilMode = override.councilMode;
   }
   ```

5. **`src/utils/config.ts`** — Add getter function:
   ```typescript
   export function getCouncilMode(): boolean {
     return getResolvedConfig().councilMode;
   }
   ```

6. **`src/prompts/config-docs.md`** — Add documentation for the new key:
   ```markdown
   ### councilMode
   - Type: `boolean`
   - Default: `false`
   - Enable council mode for planning sessions. When enabled, the planning agent spawns a team of sub-agents to investigate tasks in parallel, with a leader coordinating interview questions.
   ```

## Acceptance Criteria
- [ ] `councilMode: boolean` exists in `RafConfig` interface
- [ ] `DEFAULT_CONFIG.councilMode` is `false`
- [ ] `raf config set councilMode true` works without validation errors
- [ ] `getCouncilMode()` getter returns the resolved value

## Notes
- Follow the exact same pattern as `pushOnComplete` or `syncMainBranch` — simple boolean config keys.
- The getter will be consumed by task 2 (prompt injection).
