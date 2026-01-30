# Task: Update raf status Command for Stateless Operation

## Objective
Update the `raf status` command to work without `state.json`, deriving all status information from the RAF folder structure and outcome files.

## Context
With the removal of `state.json` in task 001, the `raf status` command needs to scan the `RAF/` directory and derive project and task statuses from the folder structure and outcome file contents.

## Requirements
- Scan `RAF/` folder to discover all projects
- Derive project status from task outcomes:
  - `planning`: has `input.md` but no `plans/` folder or empty plans
  - `ready`: has plan files but no outcome files
  - `executing`: has some outcome files but not all (or has failed outcomes without SUCCESS)
  - `completed`: all plan files have corresponding SUCCESS outcomes
  - `failed`: has FAILED outcome files
- Derive task status from outcome files:
  - `pending`: no outcome file exists
  - `completed`: outcome file exists with `## Status: SUCCESS`
  - `failed`: outcome file exists with `## Status: FAILED`
- Display same user-friendly output as before (badges, stats)
- Support `--json` flag for machine-readable output

## Implementation Steps

1. **Create project scanner** (in `src/core/state-derivation.ts` or new file)
   - Function `discoverProjects(rafPath)` that:
     - Lists all directories in `RAF/` matching pattern `NNN-project-name`
     - Returns array of project info objects

2. **Update `deriveProjectState`** function
   - Accept project path
   - Scan plans directory
   - Scan outcomes directory
   - Match and determine task statuses
   - Calculate overall project status

3. **Update status command** (`src/commands/status.ts`)
   - Remove StateManager dependency
   - Use `discoverProjects()` for listing all projects
   - Use `deriveProjectState()` for individual project details
   - Maintain existing output format and badges

4. **Update stats calculation**
   - Calculate completed/failed/pending/skipped counts from derived state
   - No changes to display logic needed

5. **Handle edge cases**
   - Project folder exists but is empty
   - Plans folder exists but is empty
   - Outcome file exists but has no status marker (treat as incomplete)
   - Malformed outcome files

## Acceptance Criteria
- [ ] `raf status` lists all projects from RAF folder
- [ ] `raf status <project>` shows detailed task status derived from files
- [ ] Status badges display correctly: `[ ]` pending, `[x]` completed, `[!]` failed
- [ ] `--json` flag outputs valid JSON with derived state
- [ ] No dependency on StateManager or state.json
- [ ] Tests cover status derivation scenarios

## Notes
- Depends on task 001 (state derivation logic)
- Skipped tasks (`[-]` badge) may not be supported without state - consider removing or deriving differently
- Performance: scanning files should be fast enough for typical project sizes (< 20 tasks)
