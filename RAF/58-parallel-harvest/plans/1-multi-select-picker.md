---
effort: medium
---
# Task: Multi-Select Project Picker

## Objective
Replace the single-select project picker with a multi-select checkbox picker so users can choose multiple projects at once.

## Context
Currently `pickPendingProject()` in `src/ui/project-picker.ts` uses `select()` from `@inquirer/prompts` which only allows picking one project. We need to switch to `checkbox()` so users can select multiple projects from the interactive picker. The return type changes from a single `PickerResult` to an array of `PickerResult[]`.

## Requirements
- Replace `select()` with `checkbox()` from `@inquirer/prompts` in `src/ui/project-picker.ts`
- Update the `pickPendingProject` function to return `PickerResult[]` (array) instead of `PickerResult | null`
- Rename the function to `pickPendingProjects` (plural) to reflect multi-select
- Update the picker message from "Select a project to execute:" to "Select projects to execute (space to toggle, enter to confirm):"
- Return an empty array instead of `null` when no projects are available or none selected
- Update all import sites that reference `pickPendingProject`

## Implementation Steps
1. In `src/ui/project-picker.ts`:
   - Change import from `select` to `checkbox`
   - Rename `pickPendingProject` → `pickPendingProjects`
   - Change the `checkbox()` call to use `checkbox()` with the same choices array
   - Update return type to `PickerResult[]`
   - Map the array of selected projects to `PickerResult[]`
   - Return `[]` instead of `null` for empty/no-selection cases
2. In `src/commands/do.ts`:
   - Update the import to use `pickPendingProjects` (plural)
   - The caller will be updated in task 2, but ensure the import compiles

## Acceptance Criteria
- [ ] `checkbox()` is used instead of `select()` in the project picker
- [ ] Function returns `PickerResult[]` — an array of selected projects
- [ ] Users can toggle multiple projects with space and confirm with enter
- [ ] Selecting zero projects results in an empty array return
- [ ] All existing imports of `pickPendingProject` are updated to the new name

## Notes
- `@inquirer/prompts` v7.10.1 exports `checkbox` — no new dependency needed
- The `checkbox()` API is very similar to `select()` — same `choices` format, but returns an array of values instead of a single value
- The caller in `do.ts` will be reworked in task 2 to loop over the array
