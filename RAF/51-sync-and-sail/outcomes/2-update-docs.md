# Task 2: Update docs for `pushOnComplete`

## Summary
Updated `src/prompts/config-docs.md` to document the new `pushOnComplete` config field introduced in Task 1.

## Key Changes

### `src/prompts/config-docs.md`
- Added `### pushOnComplete — Push After Successful Execution` section after `### syncMainBranch`, documenting type, default, and per-mode behavior
- Updated validation rules bullet to include `pushOnComplete` alongside other boolean fields
- Added `"pushOnComplete": false` to the "Full — All Settings Explicit" example config

## Acceptance Criteria
- [x] `pushOnComplete` has its own section in `src/prompts/config-docs.md` with type, default, and behavior description
- [x] Validation rules list includes `pushOnComplete`
- [x] Full example config includes `pushOnComplete: false`
- [x] `raf config wizard` can explain what `pushOnComplete` does (because the docs are in the wizard prompt)

<promise>COMPLETE</promise>
