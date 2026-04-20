---
effort: low
---
# Task: Show Project Name In Amend Editor Template

## Objective
Add the resolved project identifier to the read-only comment block shown in the `raf plan --amend` editor template.

## Requirements
- Include the project identifier in the amend editor comments using the resolved folder name with numeric prefix, for example `69-amend-whisper`.
- Limit the change to the editor template opened for amend mode; do not expand scope to other amend logs or prompts.
- Reuse the existing project resolution flow and derive the displayed value from the resolved `projectPath`, not from raw CLI input.
- Preserve the current task list, statuses, and next-task-number hint in the template.
- Add or update a unit test that would fail if the project identifier disappears from the amend editor template.

## Acceptance Criteria
- [ ] Opening `raf plan --amend <project>` passes an editor template that contains the resolved project identifier such as `69-amend-whisper`.
- [ ] The template still shows the existing task list and `New tasks will be numbered starting from ...` comment.
- [ ] The change is covered by unit tests in the amend command test surface.

## Context
The current amend flow resolves the project, loads task state, and then builds the editor contents in `runAmendCommand()` via `getAmendTemplate(...)` before calling `openEditor(...)`. Today that template includes only the task list and numbering hint, so the project name is missing from the read-only comments.

## Implementation Steps
1. In [src/commands/plan.ts](/Users/eremeev/.raf/worktrees/RAF/69-amend-whisper/src/commands/plan.ts), derive the display label from the resolved project folder name (`path.basename(projectPath)` is sufficient for the requested `ID + slug` format).
2. Extend `getAmendTemplate(...)` to accept that project label and render a dedicated comment line near the top of the template before the existing task list.
3. Keep the new line commented with `#` so it remains stripped from saved user input by the existing cleanup logic.
4. Add a regression test in the amend command test suite that exercises `raf plan --amend` and asserts the `openEditor(...)` argument contains the resolved project identifier.

## Files to Modify
- [src/commands/plan.ts](/Users/eremeev/.raf/worktrees/RAF/69-amend-whisper/src/commands/plan.ts)
- [tests/unit/plan-command-auto-flag.test.ts](/Users/eremeev/.raf/worktrees/RAF/69-amend-whisper/tests/unit/plan-command-auto-flag.test.ts) or another amend command unit test that already mocks `openEditor(...)`

## Risks & Mitigations
- If the displayed label is taken from raw CLI input, numeric or short-name lookups could show a different string than the actual resolved project. Mitigation: derive it from `projectPath` after resolution.
- If the new line is not commented, it could leak into `input.md` as user content. Mitigation: keep it inside the comment block with the existing `#` convention.

## Notes
- No README update is needed because this changes only the amend editor template, not the CLI surface.
