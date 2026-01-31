# Task 003: Refactor Status Command Output - Outcome

## Summary

Refactored the `status` command to use compact, minimal output with progress indicators using the terminal symbols module. The new design shows only project-level info with a compact progress bar.

## Key Changes

### Files Modified

1. **`src/commands/status.ts`**
   - Added imports for `SYMBOLS`, `formatProgressBar`, and `TaskStatus` from terminal-symbols module
   - Updated `listAllProjects()` to show compact format: `001 my-project ✓✓●○○ (2/5)`
   - Simplified single project view to show header and progress bar only:
     - `▶ project-name`
     - `✓✓○○○ (2/5)`
   - Removed verbose task-level detail from project list
   - Removed "Use 'raf status...'" hint from project list
   - Removed "Run 'raf status' to see available projects" hint from error message
   - Removed old `getStatusBadge()` and `getProjectStatusBadge()` functions
   - Added `derivedStatusToTaskStatus()` helper to convert DerivedTaskStatus to TaskStatus
   - Preserved `--json` output unchanged for programmatic use

### Output Examples

**Project list:**
```
001 my-project ✓✓○○○ (2/5)
002 another ✓✓✓ (3/3)
008 beautiful-do ✓✓○○○ (2/5)
```

**Single project view:**
```
▶ beautiful-do
✓✓○○○ (2/5)
```

**JSON output (unchanged):**
```json
{
  "projectName": "beautiful-do",
  "status": "executing",
  "state": { ... },
  "stats": { ... }
}
```

## Acceptance Criteria Met

- [x] Project list shows compact format with progress indicators
- [x] Progress bar correctly reflects task statuses
- [x] No task-level detail in list view
- [x] `--json` output unchanged
- [x] Clean, minimal output without extra hints

## Test Results

```
Test Suites: 24 passed, 24 total
Tests:       484 passed, 484 total
```

<promise>COMPLETE</promise>
