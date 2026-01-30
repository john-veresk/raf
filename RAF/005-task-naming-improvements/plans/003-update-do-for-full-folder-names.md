# Task: Update `raf do` for Full Folder Name Support

## Objective
Ensure `raf do` supports the full folder name identifier format (`001-fix-stuff`) for consistency across all RAF commands.

## Context
The `raf do` command already uses `resolveProjectIdentifier()` for project resolution. After task 001 enhances that function to support full folder names, this task ensures `raf do` works correctly with the new format and has appropriate tests.

## Requirements
- `raf do 001-fix-stuff` - execute project by full folder name
- `raf do a00-important-project` - execute project by full folder name with base36 prefix
- `raf do 001-fix-stuff 002-another-project` - multi-project execution with full folder names
- All existing identifier formats must continue to work

## Implementation Steps
1. Read the current `do.ts` command implementation in `src/commands/`
2. Verify it uses `resolveProjectIdentifier()` (it should based on the codebase exploration)
3. After task 001 is complete, the function should automatically support full folder names
4. Add integration tests specifically for full folder name support in `raf do`:
   - Single project with full folder name
   - Multiple projects mixing identifier formats
   - Invalid full folder names
5. Test verbose and debug modes with the new identifier format
6. Update help text if needed

## Acceptance Criteria
- [ ] `raf do 001-fix-stuff` executes the correct project
- [ ] `raf do a00-project` executes the correct project
- [ ] `raf do 001-a 002-b` executes multiple projects correctly
- [ ] Mixed formats work: `raf do 3 001-fix-stuff my-project`
- [ ] Error messages are helpful for non-matching full folder names
- [ ] All existing tests continue to pass
- [ ] New tests cover full folder name scenarios

## Notes
- This task may be minimal if `raf do` already delegates entirely to `resolveProjectIdentifier()`
- Depends on task 001 being completed first
- Focus on testing rather than code changes if the integration is already correct
