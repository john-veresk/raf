# Outcome: Fix numeric sort order for plan/outcome files

## Summary
Added a `numericFileSort` comparator helper and replaced all lexicographical `.sort()` calls on plan/outcome file lists with numeric sorting.

## Changes Made

- **`src/utils/paths.ts`**: Added `numericFileSort(a, b)` export that uses `parseInt` to compare leading numeric prefixes.
- **`src/core/state-derivation.ts`**: Updated plan files sort (line ~201) and outcome files sort (line ~208) to use `numericFileSort`.
- **`src/commands/plan.ts`**: Updated three `.sort()` calls (lines ~342, ~565, ~726) to use `numericFileSort`.
- **`src/core/project-manager.ts`**: Updated outcome files sort (line ~146) to use `numericFileSort`.
- **`src/core/pull-request.ts`**: Updated outcome files sort (line ~211) to use `numericFileSort`.

## Verification
- Build passes with `npm run build` (no TypeScript errors).
- Files named `1-x.md` through `19-x.md` now sort as 1, 2, 3, ..., 10, ..., 19.

<promise>COMPLETE</promise>
