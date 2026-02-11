---
effort: low
---
# Task: Change default effortMapping.low from haiku to sonnet

## Objective
Update the default model for low-effort tasks from `haiku` to `sonnet` across config, documentation, and tests.

## Context
The user wants sonnet as the default for easy/low-effort tasks instead of haiku. This is a simple default value change that touches the config definition, documentation, and test expectations.

## Requirements
- Change only `effortMapping.low` default — leave `failureAnalysis` and all other haiku references as-is
- Update all documentation that references the old default
- Update all test expectations that assert the old default

## Implementation Steps

1. **Update default config** in `src/types/config.ts`:
   - Change `low: 'haiku'` to `low: 'sonnet'` (line 72)

2. **Update config documentation** in `src/prompts/config-docs.md`:
   - Line 52: Change default value in the table from `"haiku"` to `"sonnet"`
   - Line 64: Change example JSON from `"low": "haiku"` to `"low": "sonnet"`
   - Line 67: Change example from `low → haiku` to `low → sonnet`
   - Line 220: Change full example from `"low": "haiku"` to `"low": "sonnet"`

3. **Update CLAUDE.md**:
   - Line 173: Change `low: "haiku"` to `low: "sonnet"` in the effortMapping description

4. **Update tests** in `tests/unit/config.test.ts` — change all assertions that expect `effortMapping.low` to be `'haiku'` to expect `'sonnet'`:
   - Line 94: `effortMapping: { low: 'haiku', ...}` → `low: 'sonnet'`
   - Line 277: `expect(config.effortMapping.low).toBe('haiku')` → `toBe('sonnet')`
   - Line 371: same pattern
   - Line 404: same pattern
   - Line 487: same pattern
   - Line 599: same pattern
   - Line 714: same pattern
   - Line 724: `low: 'haiku'` → `low: 'sonnet'`

5. **Update test** in `tests/unit/config-command.test.ts`:
   - Line 80: `low: 'haiku'` → `low: 'sonnet'`

6. **Update test** in `tests/unit/claude-runner.test.ts` — search for any `effortMapping.low` references to haiku and update

7. **Run tests** to verify all changes are consistent: `npm test`

## Acceptance Criteria
- [ ] `DEFAULT_CONFIG.effortMapping.low` equals `'sonnet'`
- [ ] All documentation references updated (config-docs.md, CLAUDE.md)
- [ ] All test assertions updated and passing
- [ ] `npm test` passes with no failures
- [ ] `npm run lint` passes

## Notes
- Do NOT change `models.failureAnalysis: 'haiku'` or any other haiku references outside of `effortMapping.low`
- The planner prompt (`src/prompts/planner.ts` or similar) may also reference effort mapping defaults — check and update if found
