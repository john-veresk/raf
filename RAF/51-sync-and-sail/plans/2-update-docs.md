---
effort: low
---
# Task: Update config docs and README for `pushOnComplete`

## Objective
Document the new `pushOnComplete` config field in the config reference docs (used by the wizard) and the README.

## Dependencies
1

## Requirements
- Add `pushOnComplete` section to `src/prompts/config-docs.md`
- Update validation rules list in config-docs.md
- Update the "Full — All Settings Explicit" example in config-docs.md
- Update README.md config example if appropriate

## Implementation Steps

### 1. Add `pushOnComplete` section to `src/prompts/config-docs.md`

Add a new section after `### syncMainBranch` (around line 158), before `### commitFormat`:

```markdown
### `pushOnComplete` — Push After Successful Execution

- **Type**: boolean
- **Default**: `false`
- **Description**: When `true`, RAF pushes the current branch to the remote after successful `raf do` execution:
  - **Non-worktree mode**: Pushes the current branch after all tasks complete successfully
  - **Worktree merge mode**: After merging the worktree branch, pushes the merged-into branch to remote
  - **Worktree PR mode**: No effect (PR creation already pushes the branch)
  - **Worktree leave mode**: No effect (no merge occurs)

Push failures produce warnings but don't fail the overall execution.
```

### 2. Update validation rules in config-docs.md

In the "Validation Rules" section (line 298), add `pushOnComplete` to the boolean validation bullet:

Change:
```
- **`autoCommit`**, **`worktree`**, and **`syncMainBranch`** must be booleans.
```
To:
```
- **`autoCommit`**, **`worktree`**, **`syncMainBranch`**, and **`pushOnComplete`** must be booleans.
```

### 3. Update "Full — All Settings Explicit" example in config-docs.md

In the full example JSON (around line 377), add `pushOnComplete` after `syncMainBranch`:

```json
  "syncMainBranch": true,
  "pushOnComplete": false,
```

### 4. Update README.md (optional)

The README config example (line 131-142) is minimal and doesn't list all boolean fields. No change needed unless you want to mention it — keep it minimal.

## Acceptance Criteria
- [ ] `pushOnComplete` has its own section in `src/prompts/config-docs.md` with type, default, and behavior description
- [ ] Validation rules list includes `pushOnComplete`
- [ ] Full example config includes `pushOnComplete: false`
- [ ] `raf config wizard` can explain what `pushOnComplete` does (because the docs are in the wizard prompt)
