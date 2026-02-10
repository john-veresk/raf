- [ ] **Accumulate token usage across retry attempts** When a task retries, this assignment overwrites prior `usageData`, and the tracker is only updated once after the retry loop, so tokens/cost from earlier failed attempts are dropped. In any task that takes multiple attempts, the per-task and total summaries underreport actual consumption, which skews cost reporting for long or flaky runs.

---

when i switch to verbose mode is see output together with timer and task name repeating on each line. could you remove interactive timer when verbose mode is on, and put it back on OFF. and don't put task on each line when in V ON mode. see log: ```● 01-extend-token-tracker-data-model 34s  [verbose: on]
		● 01-extend-token-tracker-data-model 37s  → Updating task list

		● 01-extend-token-tracker-data-model 39sNow let me add the `accumulateUsage()` function. I'll add it before the TokenTracker class.

		● 01-extend-token-tracker-data-model 46s  → Editing /Users/eremeev/.raf/worktrees/RAF/ahtahs-token-reaper/src/utils/token-tracker.ts

		● 01-extend-token-tracker-data-model 50s  → Updating task list

		● 01-extend-token-tracker-data-model 52sNow let me update the `addTask()` method to accept an array.

		● 01-extend-token-tracker-data-model 53s  → Reading /Users/eremeev/.raf/worktrees/RAF/ahtahs-token-reaper/src/utils/token-tracker.ts

		● 01-extend-token-tracker-data-model 55sNow let me update the `addTask()` method to accept an array of UsageData.

		● 01-extend-token-tracker-data-model 56s  [verbose: off]```