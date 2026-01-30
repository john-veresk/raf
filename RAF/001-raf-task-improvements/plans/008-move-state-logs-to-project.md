# Task: Move State and Logs Inside Project Folder

## Objective
Store project state and logs inside a `.raf/` folder within each project directory instead of centrally in `~/.raf/`.

## Context
Currently, state is stored centrally in `~/.raf/state.json` and logs may be scattered. Moving state and logs inside each project's `.raf/` folder makes projects more self-contained and portable.

## Requirements
- Create `.raf/` folder inside each project: `RAF/001-project-name/.raf/`
- Store `state.json` inside project's `.raf/` folder
- Store logs inside project's `.raf/logs/` folder
- Structure:
  ```
  RAF/001-project-name/
  ├── .raf/
  │   ├── state.json
  │   └── logs/
  ├── plans/
  ├── outcomes/
  └── decisions/
  ```
- Migrate existing state handling to new location
- Consider backwards compatibility or migration from old location

## Implementation Steps
1. Update `src/utils/paths.ts` to define new paths:
   - `getProjectStatePath(projectPath)` -> `{projectPath}/.raf/state.json`
   - `getProjectLogsPath(projectPath)` -> `{projectPath}/.raf/logs/`
2. Update `src/core/state-manager.ts`:
   - Change state file location to project's `.raf/state.json`
   - Create `.raf/` directory when initializing state
3. Update `src/core/project-manager.ts`:
   - Create `.raf/` and `.raf/logs/` directories on project creation
4. Update any log file paths to use new location
5. Update `src/commands/do.ts` and other commands to use new paths
6. Consider migration: check for old `~/.raf/state.json` and move/merge

## Acceptance Criteria
- [ ] `.raf/` folder created inside each project
- [ ] `state.json` stored at `{project}/.raf/state.json`
- [ ] Logs stored at `{project}/.raf/logs/`
- [ ] Old central state location no longer used for new projects
- [ ] All commands work with new paths
- [ ] All tests pass

## Notes
- Add `.raf/` to any template `.gitignore` if applicable
- Consider what happens with existing projects (migration strategy)
- The `.raf/` folder is hidden (dot prefix) to reduce clutter
- May need to update state loading to check project folder first
- Consider keeping a global config file at `~/.raf/config.json` separate from per-project state
