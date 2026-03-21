# Project Decisions

## What output style do you prefer during task execution?
Single-line progress: One updating line like `🔧 [2/5] implementing-auth ⏱ 1:23`

## How much information should be shown for each task?
Ultra-minimal: Just emoji + task name + timer, nothing else

## Which emoji style do you prefer for task states?
Dots and symbols: ● running, ✓ done, ✗ failed, ○ pending

## What format should task completion use?
Replace in place: Running line transforms to done like `✓ implementing-auth 2:34`

## How should retries and errors be displayed?
Silent retries: Just show ● until done or failed, no retry noise

## What should the project header look like?
Minimal one-liner: `▶ my-project (5 tasks)`

## What should the final summary look like?
Single result line: `✓ 5/5 completed in 12:34`

## Should the timer show during the entire project or just per-task?
Per-task only: Timer shows task duration, resets between tasks

## For the status command, what format do you prefer?
Compact list: `001 my-project ✓✓●○○ (2/5)`

## Should status show task-level detail?
Project level only: Just show project with overall progress indicator, no task list
