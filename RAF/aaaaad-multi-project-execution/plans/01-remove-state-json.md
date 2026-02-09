# Task: Remove .raf Folder and State-Based Logic

## Objective
Remove the `.raf` folder and `state.json` entirely, deriving all state from the RAF project folder structure and outcome files.

## Context
Currently, RAF maintains state in `.raf/state.json` which tracks project status, task states, and execution metadata. This creates a dependency on a technical artifact that can become out of sync with actual project state. By deriving state from the folder structure and outcome files, we make the system more resilient and transparent.

## Requirements
- Remove all usage of `.raf/state.json`
- Remove the `.raf` folder entirely (including logs directory - logs will be console-only)
- State must be derived from:
  - Project existence: `RAF/NNN-project-name/` folder exists
  - Task status: determined by outcome file existence and content
- Outcome file format must include status marker: `## Status: SUCCESS` or `## Status: FAILED` at the top
- No execution logs will be persisted - console output only

## Implementation Steps

1. **Update outcome file format** (`src/core/outcomes.ts` or similar)
   - Modify outcome generation to include `## Status: SUCCESS` or `## Status: FAILED` as first line
   - Create a parser function to read outcome files and extract status

2. **Create state derivation module** (`src/core/state-derivation.ts`)
   - Function `deriveProjectState(projectPath)` that:
     - Scans `plans/` directory for plan files
     - Scans `outcomes/` directory for outcome files
     - Matches plan files to outcome files by task ID (NNN prefix)
     - Parses outcome files for SUCCESS/FAILED status
     - Returns derived state object with task statuses

3. **Remove StateManager class** (`src/core/state-manager.ts`)
   - Delete the entire StateManager class
   - Remove all imports and usages throughout codebase

4. **Update `raf do` command** (`src/commands/do.ts`)
   - Replace StateManager usage with state derivation
   - Get pending/failed tasks from derived state
   - Remove state saving logic

5. **Update `raf plan` command** (`src/commands/plan.ts`)
   - Remove StateManager initialization
   - Remove state saving after planning

6. **Update `raf status` command** (`src/commands/status.ts`)
   - Will be updated in subsequent task (002)

7. **Remove .raf path utilities** (`src/utils/paths.ts`)
   - Remove functions related to `.raf` directory
   - Remove state file path constants

8. **Clean up imports and dependencies**
   - Remove state-manager from all imports
   - Update any type definitions that reference state types

9. **Add migration note**
   - Document that `.raf` folder can be safely deleted from existing projects

## Acceptance Criteria
- [ ] `.raf` folder is not created or used by any command
- [ ] `state.json` is not created or read
- [ ] Project state can be derived from `RAF/project/` folder structure
- [ ] Outcome files contain `## Status: SUCCESS` or `## Status: FAILED` marker
- [ ] All existing tests updated or removed as appropriate
- [ ] New tests for state derivation logic
- [ ] Code compiles without errors

## Notes
- This is a breaking change - existing `.raf` folders will be ignored
- The `raf status` command will be updated in task 002 to work with derived state
- Consider backward compatibility: old outcome files without status markers should be treated as incomplete
