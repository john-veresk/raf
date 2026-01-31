# Task: Update Documentation for New Outcome Format

## Objective
Update CLAUDE.md and any other documentation to reflect the new outcome file format and status markers.

## Context
The status marker has changed from `## Status: SUCCESS/FAILED` to `<promise>COMPLETE</promise>/<promise>FAILED</promise>`. Documentation needs to reflect this change.

## Requirements
- Update CLAUDE.md "Architectural Decisions" section
- Update any references to outcome file format
- Document the new flow: Claude writes outcome → RAF validates
- Document failure analysis behavior

## Implementation Steps
1. Read current CLAUDE.md
2. Update "State Derivation Over Persistence" section:
   - Change "Outcome files must include status marker as first line: `## Status: SUCCESS`"
   - To: "Outcome files must end with `<promise>COMPLETE</promise>` or `<promise>FAILED</promise>`"
3. Add note about Claude writing outcome files
4. Document failure analysis with Sonnet
5. Review and update any other affected documentation

## Acceptance Criteria
- [ ] CLAUDE.md reflects new outcome format
- [ ] Status marker documentation updated
- [ ] Failure analysis documented
- [ ] No stale references to old format

## Notes
- This is a documentation-only task
- Should be done after implementation tasks are complete
- Keep documentation concise and accurate
