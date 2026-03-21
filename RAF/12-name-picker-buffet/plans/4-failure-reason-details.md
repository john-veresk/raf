# Task: Failure Reason Details in Outcome Files

## Objective
Add a "Failure History" section to outcome files that lists all previous failure attempts with bullet points for each failure reason.

## Context
When tasks fail multiple times, understanding the history of failures helps debugging. Currently only the final status is tracked. This task adds detailed failure history to outcome files.

## Requirements
- Track all failure attempts (not just the most recent)
- Display as bullet points with attempt number and reason
- Add to outcome details section in outcome files
- Include failure reasons from both programmatic failures (timeout, context overflow) and Claude analysis

## Implementation Steps
1. Update failure tracking in `src/core/failure-analyzer.ts`:
   - Ensure failure reasons are captured from both programmatic detection and Claude analysis
   - Store failure reason string (1-2 sentences max)
2. Update `src/commands/do.ts` execution loop:
   - Track failure reasons across retry attempts in an array
   - Pass failure history to outcome generation
3. Update outcome file generation (likely in `src/core/project-manager.ts` or similar):
   - Add "## Failure History" section when there are any failures
   - Format as:
     ```markdown
     ## Failure History
     - **Attempt 1**: Context overflow detected after 45 minutes
     - **Attempt 2**: API rate limit exceeded
     - **Attempt 3**: Success
     ```
   - Only include this section if there were any failures (not for clean runs)
4. Update outcome file parsing if needed to handle new section
5. Add tests for failure history tracking and formatting

## Acceptance Criteria
- [ ] Outcome files include failure history when any attempts failed
- [ ] Each failed attempt shows attempt number and short reason
- [ ] Successful final attempt also shows in history (if preceded by failures)
- [ ] Clean runs (no failures) don't show failure history section
- [ ] Failure reasons are concise (1-2 sentences)
- [ ] All tests pass

## Notes
- Keep failure reasons short - full details are in the analysis section
- Consider: should successful attempt be included in history? (Yes, shows the journey)
- The failure history should appear before the `<promise>` marker
