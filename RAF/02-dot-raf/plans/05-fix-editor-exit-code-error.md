# Task: Fix Editor Exit Code Error on Planning Stage

## Objective
Investigate and fix the error "Failed to get input: Error: Editor exited with code 1" that occurs when closing vim with `:wq` during the planning stage.

## Context
When using RAF's planning feature, the editor (vim) is opened for user input. When the user saves and quits with `:wq`, an error is thrown even though this is normal successful behavior. Exit code 1 from vim typically indicates an error, but `:wq` should exit with code 0 on success.

## Requirements
- Investigate why vim exits with code 1 instead of 0
- Fix the issue so `:wq` works without error
- Maintain support for detecting actual editor failures
- Error message: "Failed to get input: Error: Editor exited with code 1"

## Implementation Steps
1. Find the code that spawns the editor process:
   - Search for editor spawning logic (likely using `child_process` or similar)
   - Look for where exit code is checked
2. Investigate potential causes:
   - Check if `$EDITOR` environment variable is set correctly
   - Verify how vim is being invoked (flags, arguments)
   - Check if temp file handling might cause issues
   - Look for TTY/terminal setup problems
3. Debug the issue:
   - Add logging to see exact exit code and signals
   - Test with different editors (vim, nano, code --wait)
   - Check if the temp file is being read before/after editor closes
4. Common fixes to try:
   - Ensure temp file exists before opening editor
   - Check file permissions on temp file
   - Verify editor command includes necessary flags
   - Handle edge case where vim writes to different location
5. Implement the fix
6. Add tests for editor integration

## Acceptance Criteria
- [ ] `:wq` in vim closes editor without error
- [ ] User input is correctly captured from editor
- [ ] Actual editor errors are still properly detected
- [ ] Works with common editors (vim, nano, etc.)
- [ ] All tests pass

## Notes
- The issue might be related to how the temp file path is passed to vim
- Vim exit codes: 0 = success, 1 = command error, 2+ = other errors
- Check if `vim` vs `vi` vs full path makes a difference
- Consider if node-pty (mentioned in CLAUDE.md) is involved in this flow
- The user mentioned `:wqi` in their description - this is likely a typo for `:wq` (or `:wq!` if forcing)
- Useful debug: run `vim tempfile; echo $?` manually to see exit behavior
