# Outcome: Add --get and --set flags to raf config

## Summary
Successfully added `--get` and `--set` flags to `raf config` command for quick, non-interactive config viewing and editing without launching the Claude wizard.

## Changes Made

### 1. Updated `src/commands/config.ts`

**Enhanced ConfigCommandOptions interface** (lines 19-23):
- Added `get?: true | string` field (true when no key, string when specific key provided)
- Added `set?: string[]` field to capture key-value pairs

**Added helper functions** (lines 120-225):
- `getNestedValue(obj, dotPath)` - traverse config by dot notation
- `setNestedValue(obj, dotPath, value)` - set leaf values by dot notation
- `deleteNestedValue(obj, dotPath)` - remove leaf values and clean up empty parents
- `getDefaultValue(dotPath)` - get default value from DEFAULT_CONFIG
- `parseValue(value)` - parse strings to numbers/booleans via JSON.parse fallback
- `formatValue(value)` - format values for console output (plain strings, formatted objects)

**Implemented handleGet function** (lines 229-246):
- When `key === true`: prints full merged config as formatted JSON
- When `key` is a string: retrieves and prints the specific value
- Plain output for strings/numbers/booleans, formatted JSON for objects
- Exits with error if key not found

**Implemented handleSet function** (lines 248-296):
- Reads current user config or starts with empty object
- Parses value using JSON.parse (for numbers/booleans) with string fallback
- Validates key exists in schema by checking default value
- Compares with default value - if equal, removes key from config (keeps config minimal)
- Cleans up empty parent objects after removal
- Validates resulting config before saving
- Deletes config file if it becomes completely empty
- Provides clear success/info messages

**Updated command definition** (lines 300-335):
- Added `.option('--get [key]', '...')` for viewing config
- Added `.option('--set <items...>', '...')` for setting values (variadic to capture key + value)
- Added mutual exclusion check between `--get` and `--set`
- `--reset` takes precedence over other flags
- Routes to appropriate handler or falls back to interactive wizard

### 2. Updated `tests/unit/config-command.test.ts`

**Added option tests** (lines 53-59):
- Tests verify `--get` and `--set` options exist on command

**Added --get flag test suite** (lines 246-269):
- Tests full config retrieval (no key)
- Tests specific key retrieval (dot notation)
- Tests nested keys (e.g., `display.showRateLimitEstimate`)
- Tests deeply nested keys (e.g., `pricing.opus.inputPerMTok`)

**Added --set flag test suite** (lines 271-343):
- Tests setting string values
- Tests setting number values (JSON.parse)
- Tests setting boolean values (JSON.parse)
- Tests default value removal (keeps config minimal)
- Tests empty parent object cleanup
- Tests validation after modification
- Tests config file deletion when empty
- Tests nested value updates

## Key Features

1. **Quick access**: No Claude wizard overhead for simple operations
2. **Dot notation**: Supports all config paths (e.g., `models.plan`, `display.showRateLimitEstimate`)
3. **Type parsing**: Automatically parses numbers and booleans via JSON.parse
4. **Minimal config**: Removes keys that match defaults to keep config file clean
5. **Parent cleanup**: Removes empty parent objects after leaf deletion
6. **Validation**: Full schema validation before saving changes
7. **Error handling**: Clear error messages for invalid keys, values, or operations
8. **Mutual exclusion**: Prevents conflicting `--get`/`--set` flags

## Usage Examples

```bash
# View full merged config
raf config --get

# View specific value (plain output)
raf config --get models.plan
# Output: opus

# Set a model
raf config --set models.plan sonnet
# Output: Set models.plan = sonnet

# Set a number
raf config --set timeout 120
# Output: Set timeout = 120

# Set a boolean
raf config --set autoCommit false
# Output: Set autoCommit = false

# Set back to default (removes from config)
raf config --set models.plan opus
# Output: Value matches default, removing models.plan from config

# View nested value
raf config --get display.showRateLimitEstimate
# Output: true
```

## Testing
- All 40 config-command tests pass
- Full test suite: 1287 tests pass
- Manual testing confirms all functionality works as expected
- Error cases properly handled (invalid keys, invalid values, mutual exclusion)

## Acceptance Criteria
- ✅ `raf config --get` prints full merged config as formatted JSON
- ✅ `raf config --get models.plan` prints plain value (e.g., `opus`)
- ✅ `raf config --set models.plan sonnet` updates config file
- ✅ Setting value to default removes it from config file
- ✅ Empty sections cleaned up after removal
- ✅ Value parsing handles strings, numbers, and booleans
- ✅ Invalid keys/values show clear error messages
- ✅ Interactive wizard NOT launched when --get or --set is present
- ✅ Tests pass

<promise>COMPLETE</promise>
