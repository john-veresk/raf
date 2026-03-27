# Outcome: Update Documentation for Symlink-Based Presets

## Summary
Updated README.md and `src/prompts/config-docs.md` to reflect the symlink-based preset behavior introduced in Task 1.

## Key Changes

### `README.md`
- Updated CLI example block (lines ~121-124): save now says "link to it", load now says "switch config link", list notes "(marks linked preset)", delete notes "(unlinks if active)"
- Updated preset table (lines ~270-273): descriptions reflect save-and-link and load-as-switch semantics

### `src/prompts/config-docs.md`
- Rewrote `presets` section to explain the full flow: set → save (moves file + creates symlink) → linked → load (switches symlink)
- Replaced "Managing Presets" section with symlink-aware instructions including:
  - Symlink detection rules (`lstatSync` vs `existsSync`)
  - Step-by-step preset operations (save, load, list, delete, unlink)
- Updated "Common User Requests" to reflect symlink operations for save, load, and unlink

## Notes
- No stale references to "overwrites current config" or "copy" semantics remain
- Config wizard LLM now has accurate instructions for managing presets via file operations

<promise>COMPLETE</promise>
