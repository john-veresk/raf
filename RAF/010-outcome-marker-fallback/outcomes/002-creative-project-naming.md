# Outcome: Creative Project Naming

## Summary

Changed the project name generator from Haiku to Sonnet and updated the prompt to generate creative, metaphorical project names instead of literal descriptive names.

## Changes Made

### Modified: `src/utils/name-generator.ts`

1. **Changed model constant** (line 5):
   - From: `const HAIKU_MODEL = 'haiku'`
   - To: `const SONNET_MODEL = 'sonnet'`

2. **Updated prompt** (lines 7-21):
   - Changed from action-oriented, descriptive naming (e.g., `add-user-auth`, `fix-payment-flow`)
   - To creative, metaphorical naming (e.g., `gatekeeper`, `phoenix`, `speed-demon`)
   - Changed max word count from 2-4 words to 1-3 words
   - Added examples of creative names for common project types

3. **Renamed function** (line 48):
   - From: `callHaikuForName()`
   - To: `callSonnetForName()`

4. **Updated all debug log messages** to reference Sonnet instead of Haiku

### Modified: `tests/unit/name-generator.test.ts`

- Updated test name descriptions from "Haiku" to "Sonnet"
- Updated model assertion from `claude --model haiku` to `claude --model sonnet`

## Acceptance Criteria Verification

- [x] Model changed from Haiku to Sonnet
- [x] Prompt updated to request creative, metaphorical names
- [x] Generated names are short (1-3 words)
- [x] Names are creative and memorable (not literal descriptions) - enforced via prompt examples
- [x] Fallback behavior still works if Sonnet call fails
- [x] All existing tests pass (544 tests passed)

<promise>COMPLETE</promise>
