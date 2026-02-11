# Outcome: Fix project name generation prompt

## Summary
Successfully tightened the Claude prompts for project name generation to prevent Haiku from outputting preamble text that gets misinterpreted as a project name option.

## Changes Made

### 1. Updated `MULTI_NAME_GENERATION_PROMPT` (src/utils/name-generator.ts:22-30)
- **Before**: Prompt started with "Generate 5 creative project names..." followed by detailed style descriptions
- **After**: Prompt now starts with "Output EXACTLY 5 project names, one per line. Do NOT include any introduction, explanation, preamble, numbering, or quotes."
- Removed numbered style descriptions (which encouraged narration) and replaced with concise bulleted rules
- Output format constraint is now the first thing the model sees

### 2. Updated `NAME_GENERATION_PROMPT` (src/utils/name-generator.ts:6-20)
- **Before**: Output format instruction was buried after creative examples
- **After**: Prompt now starts with "Output ONLY the kebab-case name. No introduction, no explanation, no quotes."
- Consistent with the multi-name approach

### 3. Updated test (tests/unit/name-generator.test.ts:173)
- Changed assertion from `expect(promptArg).toContain('Generate 5 creative project names')` to `expect(promptArg).toContain('Output EXACTLY 5 project names')`
- All 29 tests pass

## Key Improvements
- Output format constraints are now the **first** thing in both prompts
- Explicit prohibition of preamble/introduction text
- Simplified instructions reduce the urge for models (especially Haiku) to narrate
- Maintains creative guidance while being more directive about format

## Testing
- All existing unit tests pass (29/29)
- No changes to parsing logic as requested

<promise>COMPLETE</promise>
