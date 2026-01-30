# Task: Create .raf Folder Structure

## Objective
Create a `.raf` folder at the project root to store runtime artifacts, separating technical/generated files from committed code.

## Context
Currently, RAF stores `state.json` and `logs/` inside `RAF/project/` folders. These runtime artifacts should be separated into a dedicated `.raf/` folder at the repo root for cleaner organization. The `.raf` folder should be gitignored while the main `RAF/` folder remains committed.

## Requirements
- Create `.raf/` folder at repo root level
- Move runtime artifacts to `.raf/`:
  - `state.json` - execution state tracking
  - `logs/` - session logs
  - Any cache files or temp files generated during execution
- Add `.raf/` to `.gitignore`
- Keep `RAF/` folder committed (plans, prompts, outcomes)
- Only apply to new projects (no migration of existing projects needed)

## Implementation Steps
1. Update project initialization code to create `.raf/` folder at repo root
2. Modify paths in state management code:
   - Change `RAF/project/state.json` → `.raf/state.json`
   - Change `RAF/project/logs/` → `.raf/logs/`
3. Update any other code that writes runtime/temp files to use `.raf/`
4. Add `.raf/` entry to `.gitignore` template for new projects
5. Update documentation to reflect new folder structure

## Acceptance Criteria
- [ ] New projects create `.raf/` folder at repo root
- [ ] `state.json` is written to `.raf/state.json`
- [ ] Logs are written to `.raf/logs/`
- [ ] `.raf/` is added to `.gitignore`
- [ ] RAF folder structure remains committed
- [ ] All tests pass

## Notes
- This change only affects new projects - existing projects continue working with old structure
- Consider adding a clear comment in `.gitignore` explaining what `.raf/` is for
- The `.raf/` folder may need to be created lazily (on first write) if it doesn't exist
