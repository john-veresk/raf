---
effort: low
---
# Task: Fix numeric sort order for plan/outcome files

## Objective
Replace all lexicographical `.sort()` calls on numbered file lists with numeric sorting so tasks execute in correct order (1, 2, 10 instead of 1, 10, 2).

## Context
`raf do` reads plan files named like `1-task.md`, `10-task.md` and sorts them with `.sort()`, which uses string comparison. This causes task 10 to execute before task 2. The codebase already has correct numeric sorting for projects (`a.number - b.number`), but plan/outcome file sorting was missed.

## Requirements
- Create a shared numeric sort helper function in `src/utils/paths.ts` (where `TASK_ID_PATTERN` already lives)
- The helper should extract the leading number from filenames like `1-task-name.md` and sort numerically
- Replace all lexicographical `.sort()` calls on plan/outcome files across the codebase

## Implementation Steps

1. Add a `numericFileSort` comparator function to `src/utils/paths.ts`:
   ```typescript
   export function numericFileSort(a: string, b: string): number {
     const numA = parseInt(a, 10);
     const numB = parseInt(b, 10);
     return numA - numB;
   }
   ```
   `parseInt` on `"10-task-name.md"` returns `10` — it stops at the first non-numeric character.

2. Update the following `.sort()` calls to use `numericFileSort`:
   - `src/core/state-derivation.ts` ~line 201: plan files `.sort()` → `.sort(numericFileSort)`
   - `src/core/state-derivation.ts` ~line 208: outcome files `.sort()` → `.sort(numericFileSort)`
   - `src/commands/plan.ts` ~lines 342, 565, 726: plan file sorting after creation
   - `src/project-manager.ts` ~line 146: outcome files sorting
   - `src/pull-request.ts` ~line 211: outcome files sorting for PR generation

3. Add the import `import { numericFileSort } from '../utils/paths'` (adjust relative path) to each file that needs it.

4. **Do NOT touch** `src/core/worktree.ts` line 353 — worktree directory sorting may not follow the same numeric prefix pattern; verify before changing.

## Acceptance Criteria
- [ ] `numericFileSort` helper exists in `src/utils/paths.ts`
- [ ] All plan/outcome file `.sort()` calls use numeric comparison
- [ ] Files named `1-x.md` through `19-x.md` sort as 1,2,3,...,10,...,19 (not 1,10,11,...,19,2,3,...)
- [ ] Project builds without errors (`npm run build` or equivalent)

## Notes
- `parseInt("10-task-name.md", 10)` correctly returns `10` — no regex needed.
- The existing `TASK_ID_PATTERN` in `paths.ts` confirms the numeric prefix convention.
