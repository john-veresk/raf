# Task: Simplify Logger for Minimal Output

## Objective
Clean up the logger to support the minimal output style without unnecessary prefixes.

## Context
The current logger adds prefixes like "Error:", "✓", and context prefixes. For the minimal style, we want cleaner output where the caller controls all formatting.

## Requirements
- Add `print(text)` method that outputs exactly what's passed (no prefixes)
- Keep existing methods for backwards compatibility with verbose mode
- Remove context prefix feature (no longer needed with minimal output)
- Simplify `success()` to just output with `✓` (already does this)
- Simplify `error()` to output with `✗` instead of "Error:" prefix

## Implementation Steps
1. Add `print(message)` method for raw output
2. Update `error()` to use `✗` prefix instead of "Error:"
3. Remove or deprecate `setContext()` and `clearContext()`
4. Keep `warn()` with ⚠️ prefix
5. Ensure all tests still pass

## Acceptance Criteria
- [ ] New `print()` method outputs text exactly as passed
- [ ] `error()` uses `✗` prefix
- [ ] Context prefix methods removed or no-op
- [ ] All existing functionality still works
- [ ] Tests updated/passing

## Notes
- The `do` command currently uses setContext for task labels - this will be replaced by the new single-line progress format
- Keep changes minimal - don't over-engineer
