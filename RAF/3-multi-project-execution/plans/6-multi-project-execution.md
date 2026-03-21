# Task: Multi-Project Execution Support

## Objective
Allow `raf do` command to accept multiple project names or numbers, executing them sequentially.

## Context
Users may want to run multiple projects in sequence without manually invoking `raf do` for each one. This is useful for batch processing or running related projects together.

## Requirements
- Support syntax: `raf do project1 project2 project3`
- Support number syntax: `raf do 003 004 005`
- Support mixed syntax: `raf do 003 my-project 005`
- No range support (e.g., `003-005` is NOT supported)
- Projects run sequentially (one after another)
- If a project fails, continue with remaining projects
- Report summary at end showing status of all projects
- Each project uses its own timeout (per-task timeout preserved)

## Implementation Steps

1. **Update command argument parsing** (`src/commands/do.ts`)
   - Change from single `<projectName>` to variadic `<projects...>`
   - Update Commander.js argument: `.argument('<projects...>', 'Project name(s) or number(s) to execute')`

2. **Create project resolver function**
   - Function `resolveProjectIdentifier(identifier)` that:
     - If identifier is numeric (e.g., "003"), find matching project folder
     - If identifier is a name, use as-is
     - Return full project name or throw if not found

3. **Update main execution flow**
   - Loop through all project identifiers
   - Resolve each to full project name
   - Execute each project using existing single-project logic
   - Collect results for each project

4. **Implement continue-on-failure**
   - Wrap single project execution in try-catch
   - Log failure and continue to next project
   - Track which projects succeeded/failed

5. **Create multi-project summary**
   - After all projects complete, show summary:
     ```
     === Multi-Project Summary ===
     ✓ 003-project-a: Completed (5/5 tasks)
     ✗ 004-project-b: Failed (3/5 tasks)
     ✓ 005-project-c: Completed (3/3 tasks)

     Total: 2 completed, 1 failed
     ```

6. **Handle edge cases**
   - Project not found by number
   - Duplicate projects in list (skip duplicates)
   - Empty project list (show usage help)

7. **Update help text and documentation**
   - Update `--help` output to show multi-project usage
   - Add examples: `raf do 003 004` and `raf do project-a project-b`

8. **Update tests**
   - Test multiple projects execution
   - Test mixed name/number input
   - Test continue-on-failure
   - Test summary output
   - Test project resolution

## Acceptance Criteria
- [ ] `raf do project1 project2` executes both projects
- [ ] `raf do 003 004` resolves numbers to project names
- [ ] Projects execute sequentially
- [ ] Failure in one project doesn't stop others
- [ ] Summary shows results for all projects
- [ ] Tests cover multi-project scenarios

## Notes
- Depends on task 005 (single project re-run support)
- Options like `--timeout` and `--force` apply to all projects
- Consider: should we support project-specific options? Decision: No, keep simple
- Exit code: 0 if all succeed, 1 if any fail
