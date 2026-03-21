# Task: Add Identifier Support to `raf status`

## Objective
Update the `raf status` command to accept all identifier formats (number, base36, full folder name, project name) for consistency with other commands.

## Context
Currently `raf status [projectName]` may only accept project names. After task 001 enhances `resolveProjectIdentifier`, this command should use that function to support all identifier formats, giving users a consistent experience across all RAF commands.

## Requirements
- `raf status 3` - status by numeric ID
- `raf status 003` - status by zero-padded numeric ID
- `raf status a00` - status by base36 ID
- `raf status my-project` - status by project name (existing)
- `raf status 001-my-project` - status by full folder name (new)
- `raf status a00-my-project` - status by full folder name with base36 prefix (new)

## Implementation Steps
1. Read the current `status.ts` command implementation in `src/commands/`
2. Identify how the project name/identifier is currently resolved
3. Replace or update the resolution logic to use `resolveProjectIdentifier()` from `src/utils/paths.ts`
4. Ensure error messages are clear when the identifier doesn't match any project
5. Add integration tests for the status command with various identifier formats
6. Update any help text or documentation for the command

## Acceptance Criteria
- [ ] `raf status 3` shows status for project 003
- [ ] `raf status 001-fix-stuff` shows status for that project
- [ ] `raf status a00-important` shows status for that project
- [ ] Invalid identifiers show helpful error messages
- [ ] `raf status` (no argument) continues to list all projects
- [ ] Tests cover the new identifier support
- [ ] `--json` output works correctly with all identifier formats

## Notes
- Depends on task 001 being completed first
- The behavior when no project matches should be consistent with `raf do`
