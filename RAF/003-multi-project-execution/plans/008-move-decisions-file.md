# Task: Move decisions/DECISIONS.md to decisions.md

## Objective
Simplify project structure by moving the decisions file from `decisions/DECISIONS.md` to `decisions.md` at the project root.

## Context
Currently, decisions are stored in a nested folder structure (`decisions/DECISIONS.md`). This adds unnecessary complexity when there's only one decisions file per project. Moving it to `decisions.md` at the project root simplifies the structure and makes it more discoverable.

## Requirements
- Move `decisions/DECISIONS.md` to `decisions.md` at project root
- Update `raf plan` command to create `decisions.md` instead of `decisions/DECISIONS.md`
- Update planning prompt to reference new location
- Remove empty `decisions/` folder creation
- Handle migration of existing projects (optional - just document)

## Implementation Steps

1. **Update project folder creation** (`src/commands/plan.ts` or `src/utils/paths.ts`)
   - Remove `decisions/` folder creation
   - Create `decisions.md` file directly in project root

2. **Update planning prompt** (`src/prompts/planning-prompt.ts` or similar)
   - Change path reference from `decisions/DECISIONS.md` to `decisions.md`
   - Update any instructions that mention the decisions folder

3. **Update path utilities** (`src/utils/paths.ts`)
   - Update `getDecisionsPath()` or similar function
   - Return `RAF/NNN-project-name/decisions.md` instead of `RAF/NNN-project-name/decisions/DECISIONS.md`

4. **Update state derivation** (if decisions are used in state)
   - Check if decisions file is referenced in state derivation
   - Update paths accordingly

5. **Update documentation**
   - Update folder structure documentation in CLAUDE.md
   - Update any references in README

6. **Clean up existing projects (optional)**
   - Document that existing `decisions/DECISIONS.md` files can be manually moved
   - Or add migration logic to move file if old location exists

## New Project Structure

Before:
```
RAF/001-example-project/
├── input.md
├── decisions/
│   └── DECISIONS.md
├── plans/
│   └── ...
└── outcomes/
    └── ...
```

After:
```
RAF/001-example-project/
├── input.md
├── decisions.md
├── plans/
│   └── ...
└── outcomes/
    └── ...
```

## Acceptance Criteria
- [ ] New projects create `decisions.md` at project root
- [ ] `decisions/` folder is not created for new projects
- [ ] Planning prompt references correct path
- [ ] Path utilities return correct location
- [ ] Documentation updated
- [ ] Tests updated

## Notes
- This is a minor structural change but improves discoverability
- Existing projects will continue to work (decisions file location doesn't affect execution)
- Consider: should we support both locations for backward compatibility? Decision: No, keep it simple
