# Task: Move SUMMARY.md to Outcomes Folder

## Objective
Reorganize project structure to place SUMMARY.md inside an `outcomes/` subfolder within each project folder.

## Context
Currently SUMMARY.md is generated at the project root level. Moving it to an `outcomes/` folder provides better organization, separating the final deliverables/summary from the planning artifacts (plans folder) and technical files (.raf folder).

## Requirements
- Create `outcomes/` folder inside each project: `RAF/project/outcomes/`
- Move/generate SUMMARY.md to `outcomes/SUMMARY.md`
- Keep the filename as SUMMARY.md (no renaming)
- Only apply to new projects (no migration of existing projects)

## Implementation Steps
1. Update project initialization to create `outcomes/` folder structure
2. Find code that generates/writes SUMMARY.md
3. Update the output path from `RAF/project/SUMMARY.md` to `RAF/project/outcomes/SUMMARY.md`
4. Ensure `outcomes/` folder is created before writing SUMMARY.md
5. Update any code that reads SUMMARY.md to use new path
6. Update documentation to reflect new location

## Acceptance Criteria
- [ ] New projects have `outcomes/` folder created
- [ ] SUMMARY.md is written to `outcomes/SUMMARY.md`
- [ ] SUMMARY.md keeps its original filename
- [ ] Any code reading SUMMARY.md uses correct path
- [ ] All tests pass

## Notes
- The `outcomes/` folder could potentially hold other deliverables in the future
- Consider creating the folder lazily when first outcome is generated
- New project folder structure will be:
  ```
  RAF/001-project-name/
  ├── plans/
  │   ├── 001-task.md
  │   └── 002-task.md
  └── outcomes/
      └── SUMMARY.md
  ```
