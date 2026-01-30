# Task: Cleanup Empty Project Folders

## Objective
Prevent RAF from leaving empty project folders when the user cancels during task interview or no plans are created.

## Context
Currently, RAF creates the project folder structure immediately when the `plan` command starts. If the user cancels during the task interview phase (e.g., Ctrl+C), the empty folder structure remains, cluttering the RAF directory. This task adds cleanup logic to remove folders that contain no plan files.

## Requirements
- Delete project folder if it exists but contains no plan files
- Trigger cleanup when user cancels during task interview (before any plans are written)
- Do NOT delete folders that have at least one plan file
- Handle edge cases: folder partially created, plans subfolder exists but empty, etc.
- No change to successful workflow (folders with plans should remain)

## Implementation Steps

1. **Add cleanup logic to plan command**
   - Location: `src/commands/plan.ts`
   - Wrap the main planning flow in try-catch-finally
   - In finally block, check if project folder exists and is empty

2. **Implement folder check utility**
   - Create function `isProjectFolderEmpty(projectPath: string): boolean`
   - Check if `plans/` subfolder exists
   - If exists, check if it contains any `.md` files
   - Return true only if no plan files exist

3. **Add cleanup function**
   - Create function `cleanupEmptyProject(projectPath: string): void`
   - Verify folder is empty using the check utility
   - Use `fs.rmSync(projectPath, { recursive: true })` to remove folder
   - Log cleanup action for user visibility

4. **Handle process signals gracefully**
   - Ensure cleanup runs even on SIGINT (Ctrl+C)
   - Use process.on('SIGINT') handler if not already present
   - Call cleanup before process exit

5. **Add tests**
   - Test: Folder deleted when user cancels before creating plans
   - Test: Folder preserved when at least one plan exists
   - Test: Cleanup handles non-existent folder gracefully
   - Test: Cleanup handles folder with only subdirectories (no plans)

## Acceptance Criteria
- [ ] Empty project folders are removed when no plans are created
- [ ] Folders with plans are never deleted
- [ ] Cleanup works on Ctrl+C during interview
- [ ] Cleanup works if plan command errors out early
- [ ] User sees a log message when cleanup occurs
- [ ] All tests pass
- [ ] No breaking changes to existing functionality

## Notes
- Use `fs.existsSync()` before attempting cleanup to avoid errors
- Consider logging at 'debug' level rather than 'info' to avoid noise
- The cleanup should be idempotent - safe to call multiple times
- Watch for race conditions if RAF is running multiple instances (unlikely but possible)