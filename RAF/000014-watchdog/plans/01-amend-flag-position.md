# Task: Support --amend flag after project identifier

## Objective
Allow `--amend` flag to be used after the project identifier, in addition to the existing syntax.

## Context
Currently `raf plan --amend <identifier>` works, but users may naturally type `raf plan <identifier> --amend`. Both syntaxes should be supported for better UX.

## Requirements
- Support `raf plan <identifier> --amend` (flag after positional argument)
- Keep existing `raf plan --amend <identifier>` working (backward compatibility)
- The positional argument becomes the project identifier in amend mode
- Show clear error if `--amend` is used without a project identifier

## Implementation Steps
1. Read `src/commands/plan.ts` to understand current implementation
2. Change `--amend` option from requiring an argument (`-a, --amend <identifier>`) to a boolean flag (`-a, --amend`)
3. Update action handler logic:
   - If `--amend` flag is set, use the positional `projectName` argument as the identifier
   - If positional argument is missing when `--amend` is set, show error message
4. Update the `PlanCommandOptions` interface to make `amend` a boolean
5. Update tests in `tests/unit/plan-command.test.ts` to cover both syntaxes
6. Run tests to verify changes

## Acceptance Criteria
- [ ] `raf plan myproject --amend` works (opens editor for amendment)
- [ ] `raf plan --amend myproject` still works (backward compatibility via positional arg)
- [ ] `raf plan --amend` without identifier shows helpful error message
- [ ] All existing tests pass
- [ ] New tests added for both syntax variants

## Notes
- Commander.js allows boolean options with `-a, --amend` syntax (no angle brackets)
- The positional argument `[projectName]` will serve as the identifier in amend mode
