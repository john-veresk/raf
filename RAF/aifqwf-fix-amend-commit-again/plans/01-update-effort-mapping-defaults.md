---
effort: low
---
# Task: Update default effortMapping to use opus for medium tasks

## Objective
Change the default `effortMapping.medium` from `sonnet` to `opus` so medium-effort tasks execute with Opus by default.

## Context
The current defaults map both low and medium effort to sonnet. The user wants medium-effort tasks to use opus for better quality on moderately complex work, while keeping low-effort tasks on sonnet.

Current defaults: `{ low: "sonnet", medium: "sonnet", high: "opus" }`
Target defaults: `{ low: "sonnet", medium: "opus", high: "opus" }`

The `models.execute` ceiling remains `opus` (unchanged).

## Requirements
- Change `effortMapping.medium` default from `"sonnet"` to `"opus"` in `DEFAULT_CONFIG`
- Update all documentation that references the default effortMapping values
- Update all tests that assert on the default effortMapping values

## Implementation Steps
1. Edit `src/types/config.ts`: Change `medium: 'sonnet'` to `medium: 'opus'` in `DEFAULT_CONFIG.effortMapping`
2. Edit `src/prompts/config-docs.md`: Update all references to the default effortMapping (there should be mentions in the config reference showing `medium: "sonnet"` that need to become `medium: "opus"`)
3. Edit `CLAUDE.md`: Update the effortMapping example under "Per-Task Model Resolution" section from `{ low: "sonnet", medium: "sonnet", high: "opus" }` to `{ low: "sonnet", medium: "opus", high: "opus" }`
4. Edit `tests/unit/config.test.ts`: Update all test assertions that check the default medium mapping (search for `medium` assertions referencing `sonnet`)
5. Edit `tests/unit/config-command.test.ts`: Update any assertions checking default effortMapping display output
6. Run `npm test` to verify all tests pass

## Acceptance Criteria
- [ ] `DEFAULT_CONFIG.effortMapping.medium` is `"opus"`
- [ ] `src/prompts/config-docs.md` reflects the new defaults
- [ ] `CLAUDE.md` reflects the new defaults
- [ ] All tests pass with `npm test`

## Notes
A previous commit (a5755cb) changed `effortMapping.low` from haiku to sonnet, touching the same files. Follow the same pattern for this change.
