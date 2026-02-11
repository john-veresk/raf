
- [ ] add a quick way to see and edit current configuration like 'raf config --get model.plan' (or just get to see whole config, merged with default) and 'raf config --set model.plan sonnet' (support only last level of nesting, can't save whole model object). if get and set flag are present - don't lanuch setting wizard with sonnet (like with --reset)
- [ ] investigate why token calculation is so low? (example: Tokens: 22 in / 6,861 out). does't it include amend system prompt? my understanding that input tokens are roughly sum of amend system prompt and plan. but plans are usually bigger that 22 tokens. investigate and create task plan to fix if needed
- [ ] raf commits new plans in "--amend" mode. it should only commit changes in input.md and decisions.md
- [ ] fix pr comment (PR #5)[src/utils/terminal-symbols.ts](https://github.com/john-veresk/raf/pull/5/files/69f5fab1e125f871ce1356d366195ae34d195830#diff-796b8f7b8ea37125b855e9cb41581303ae65bc9e30693f8d9f91a8eb91554f15)

		|   |
		|---|
		|cost: CostBreakdown,|
		|options: TokenSummaryOptions = {}|
		|): string {|
		|const { showCacheTokens = true, showRateLimitEstimate = false, rateLimitPercentage } = options;|

		 **[![P2 Badge](https://camo.githubusercontent.com/f2c1aacb361ddd3a0e9f9cacdb84fab050de434017f6747bb916e31e29bdf03d/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f50322d79656c6c6f773f7374796c653d666c6174)](https://camo.githubusercontent.com/f2c1aacb361ddd3a0e9f9cacdb84fab050de434017f6747bb916e31e29bdf03d/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f50322d79656c6c6f773f7374796c653d666c6174) Enable rate-limit estimate in default token summaries**
		
		The formatter now defaults `showRateLimitEstimate` to `false`, but `raf do` still calls `formatTaskTokenSummary(...)` and `formatTokenTotalSummary(...)`without passing `TokenSummaryOptions`, so the newly added 5h window estimate is never shown in execution summaries despite `display.showRateLimitEstimate`defaulting to `true`. This makes the new rate-limit display/config effectively inactive in the main execution path unless every caller is updated.
- [ ] fix pr comment (https://github.com/john-veresk/raf/pull/5). use gh tool to fetch context if needed. [src/core/worktree.ts](https://github.com/john-veresk/raf/pull/5/files/69f5fab1e125f871ce1356d366195ae34d195830#diff-f5303b02aaa03b1fd86860fe0c47fe6aaa7e3e5ca598c7b581d54470d668670b)

		Comment on lines +534 to +537
		
		|   |
		|---|
		|success: true,|
		|mainBranch,|
		|hadChanges: false,|
		|error: `Local ${mainBranch} has diverged from origin, not updated`,|
	
		
		 **[![P2 Badge](https://camo.githubusercontent.com/f2c1aacb361ddd3a0e9f9cacdb84fab050de434017f6747bb916e31e29bdf03d/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f50322d79656c6c6f773f7374796c653d666c6174)](https://camo.githubusercontent.com/f2c1aacb361ddd3a0e9f9cacdb84fab050de434017f6747bb916e31e29bdf03d/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f50322d79656c6c6f773f7374796c653d666c6174) Treat diverged main branch as sync failure**
		
		When `git fetch origin <main>:<main>` fails because local `<main>` has diverged, this branch returns `success: true` with an `error` message, which means the new callers in `runDoCommand`/`runPlanCommand` (they only warn on `success === false`) silently continue without actually updating the local main branch. In this state worktree/PR flows proceed on stale base refs without surfacing the sync problem, so this path should be reported as a failure (or callers must treat `error` as a warning condition).
