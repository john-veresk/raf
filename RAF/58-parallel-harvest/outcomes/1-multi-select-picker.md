# Multi-Select Project Picker

## Summary
Replaced the single-select project picker with a multi-select checkbox picker so users can choose multiple projects at once.

## Changes
- **src/ui/project-picker.ts**: Changed `select()` to `checkbox()` from `@inquirer/prompts`, renamed `pickPendingProject` → `pickPendingProjects`, updated return type from `PickerResult | null` to `PickerResult[]`, updated message to include space/enter instructions, return `[]` instead of `null` for empty cases
- **src/commands/do.ts**: Updated import to `pickPendingProjects`, adapted caller to handle array return (uses first selected project for now — task 2 will add full multi-project execution)
- **tests/unit/project-picker.test.ts**: Updated all picker tests to use `mockCheckbox` instead of `mockSelect`, updated assertions for array returns, added test for multiple project selection and empty selection

## Notes
- The caller in `do.ts` currently uses `selectedProjects[0]` as a bridge — task 2 will implement full multi-project execution loop

<promise>COMPLETE</promise>
