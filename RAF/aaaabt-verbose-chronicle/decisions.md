# Project Decisions

## For the amendment iteration reference feature — when a new task looks like a follow-up/fix to a previous completed task, how should the reference appear in the new plan?
Context section, make sure to put file path to prev task outcome.

## Should the iteration reference be determined automatically by the planning Claude (via prompt instructions), or should RAF code analyze task content programmatically?
Prompt-based (Recommended) — update the amend system prompt to instruct Claude to identify follow-ups and include references to previous tasks in new plans.

## For verbose task name display — should the task name appear everywhere task ID is shown, or just in the main header?
Everywhere — show task name alongside ID in all verbose log messages, status updates, and summaries.

## For streaming Claude output in verbose mode — is it currently broken or is there a different streaming behavior wanted?
In verbose mode only a summary of completed work is shown, not constant stream of how Claude executes. Need to investigate and fix — streaming should show real-time Claude output.

## For verifying git commits before halting Claude — how should RAF check that the commit landed?
All three checks combined: (1) HEAD changed from before task, (2) new commit message starts with RAF[project:task], and (3) outcome file is committed in git.

## If the commit hasn't landed when the grace period expires, what should happen?
Extend grace period — keep waiting (with a maximum cap) until the commit appears or a hard timeout is reached.

## What should the maximum cap be for the extended grace period when waiting for commit?
180 seconds (3 minutes total max wait for commit). Current grace period is 60 seconds.

## For the verbose streaming fix — any suspicion about what's wrong?
Investigate fully — debug the entire verbose code path end-to-end to find why streaming isn't working.
