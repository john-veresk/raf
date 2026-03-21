effort: medium
---
# Task: Add --get and --set flags to raf config

## Objective
Add `raf config --get [key]` and `raf config --set <key> <value>` for quick config viewing/editing without launching the interactive Claude wizard.

## Context
Currently `raf config` always launches an interactive Claude session (Sonnet). For quick operations like checking a single value or changing a model, this is slow and expensive. The `--get` and `--set` flags provide instant, non-interactive alternatives.

## Requirements
- `raf config --get` (no key): Print full merged config as JSON (defaults + overrides)
- `raf config --get models.plan`: Print plain value (e.g., `opus`) — no key prefix, no quotes for strings
- `raf config --set models.plan sonnet`: Set a leaf-level config value
- Only support leaf-level keys (dot-notation like `models.plan`, `timeout`, `display.showRateLimitEstimate`)
- Do NOT support setting entire nested objects (e.g., `--set models '{...}'`)
- If `--get` or `--set` is present, do NOT launch the interactive wizard
- If value matches default after `--set`, remove the key from config file (keep config minimal)
- If removing the last key from a section empties it, remove the section too
- Validate the value before saving (use existing validation)
- `--set` and `--get` are mutually exclusive; show error if both provided
- `--reset` takes precedence / is mutually exclusive with `--get`/`--set`

## Implementation Steps

1. **Edit `src/commands/config.ts`** — Add new options to the command:
   ```typescript
   .option('--get [key]', 'Show config value (all config if no key, or specific dot-notation key)')
   .option('--set <key> <value>', 'Set a config value using dot-notation key')
   ```
   Note: Commander.js handles `--set key value` with two arguments. You may need to use `.option('--set <key_value...>')` or handle it as a positional pair. Consider using a variadic option that takes exactly 2 values.

2. **Update the `ConfigCommandOptions` interface**:
   ```typescript
   interface ConfigCommandOptions {
     reset?: boolean;
     get?: true | string;  // true when --get with no key, string when --get <key>
     set?: string[];       // [key, value]
   }
   ```

3. **Update the action handler** to check for `--get`/`--set` before launching the wizard:
   ```typescript
   if (options.reset) { await handleReset(); return; }
   if (options.get !== undefined) { handleGet(options.get); return; }
   if (options.set) { handleSet(options.set); return; }
   // ... existing wizard launch
   ```

4. **Implement `handleGet(key?: string | true)`**:
   - If `key` is `true` (no argument): Print `JSON.stringify(resolveConfig(), null, 2)`
   - If `key` is a string: Use dot-notation to traverse the resolved config object
   - Print the value: strings plain, numbers/booleans as-is, objects as JSON
   - If key not found, print error and exit with code 1

5. **Implement `handleSet(args: string[])`**:
   - Parse `args` as `[key, value]`
   - Read the current user config file (or start with `{}`)
   - Parse the value: try `JSON.parse(value)` first (for numbers, booleans), fall back to string
   - Use dot-notation to set the leaf value in the user config object
   - Check if the value matches the default at that path — if so, remove the key instead
   - If removing leaves an empty parent object, remove the parent too
   - Validate the resulting config with `validateConfig()`
   - Save with `saveConfig()`
   - If config becomes empty `{}`, delete the file entirely
   - Print confirmation message

6. **Add helper functions**:
   - `getNestedValue(obj, dotPath)` — traverse an object by dot-notation path
   - `setNestedValue(obj, dotPath, value)` — set a leaf value by dot-notation path
   - `deleteNestedValue(obj, dotPath)` — remove a leaf and clean up empty parents
   - `getDefaultValue(dotPath)` — get the default value at a dot-notation path from `DEFAULT_CONFIG`

7. **Add tests** in `tests/unit/config-command.test.ts` (or update existing):
   - `--get` with no key returns full config JSON
   - `--get models.plan` returns just the value
   - `--get nonexistent.key` exits with error
   - `--set models.plan sonnet` updates the config file
   - `--set timeout 120` parses as number
   - `--set autoCommit false` parses as boolean
   - `--set models.plan opus` (default value) removes the key from file
   - Setting last key in section removes the section
   - Validation errors are reported

## Acceptance Criteria
- [ ] `raf config --get` prints full merged config as formatted JSON
- [ ] `raf config --get models.plan` prints plain value (e.g., `opus`)
- [ ] `raf config --set models.plan sonnet` updates config file
- [ ] Setting value to default removes it from config file
- [ ] Empty sections cleaned up after removal
- [ ] Value parsing handles strings, numbers, and booleans
- [ ] Invalid keys/values show clear error messages
- [ ] Interactive wizard NOT launched when --get or --set is present
- [ ] Tests pass

## Notes
- The `resolveConfig()` function already merges defaults + overrides, perfect for `--get`
- The `saveConfig()` function already handles file creation and formatting
- The `validateConfig()` function validates the entire user config, so validate after modification
- For `--get`, use the resolved (merged) config; for `--set`, read/write only the user config file
- Commander.js variadic options: `--set <key> <value>` can be done with `.option('--set <items...>')` which collects remaining args
