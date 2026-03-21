
- [ ] add estimated percentage from 5h window. make default 88000 (this is sonnet token, for other models it should be converted based on model pricing. antropic say that there is one shared token/credit pool per 5‑hour window, not separate “in” and “out” caps. calculate sum in and out and divide by 88000 (for example)
		- API prices tell you the relative weight:
		•	Example current non‑batch API pricing:
		•	Haiku 4.5: 1 $/M input, 5 $/M output
		•	Sonnet 4.5: 3 $/M input, 15 $/M output
		•	Opus 4.5 / 4.6: 5 $/M input, 25 $/M output
		•	That means, on the API:
		•	Opus input token ≈ 1.7× a Sonnet input token, 5× a Haiku input token.
		•	Opus output token ≈ 1.7× a Sonnet output token, 5× a Haiku output token.
		3.	Most reverse‑engineering + Anthropic’s own recommendations assume the subscription credits follow the same ratios. So in practice, on the same 5‑hour window:
		•	If you spend it all on Sonnet, you get about the “44k / 88k / 220k tokens per 5 h” that people quote.
		•	If you instead spend it all on Opus, you will hit the same credit ceiling with fewer raw tokens, roughly scaled by the price ratio (so ballpark ~60% of the Sonnet tokens, given Opus is ~1.7× the cost per token).
		•	If you use Haiku, you can squeeze many more tokens into the same 5‑hour credit window, again roughly proportionate to its much lower price.
	So when saying “heavier models like Opus eat that pool faster” it means:
		•	The 5‑hour window is measured in cost‑weighted credits, not simple token count.
		•	One Opus token “costs” more of that pool than one Sonnet token, in about the same ratio as the API prices.
		•	Therefore, for the same 5‑hour cap, you get fewer total tokens with Opus, more with Haiku, middle with Sonnet.
		also make it configurable there show session % estimation or not, configurable, also showing cache estimation is configurable. 
- [ ] `addTask` now prices a task from `accumulateUsage(attempts)`, but that merge can include attempts where only aggregate usage fields are present and `modelUsage` is empty (which `extractUsageData` allows when `event.modelUsage` is absent). If any other attempt has `modelUsage`, `calculateCost` takes the per-model branch and ignores aggregate-only tokens, so mixed-attempt retries underreport cost; compute cost per attempt or carry unmatched aggregate tokens into pricing.
- [ ] push main to remote before making PR and pull main before creating gitworktree (configurable option, default true). also branch name is configurable
- [ ] remove "claudeCommand": "claude" from config ( update docs)
- [ ] in "raf do" logs show version which is used for execution in full format
- [ ] adress PR (https://github.com/john-veresk/raf/pull/4) review comment [src/commands/config.ts](https://github.com/john-veresk/raf/pull/4/files/8b5786ed7c5e8aaec01cfa47e447550c2a684792#diff-8c467368fd64da9077ad462358fce5589607dfbfe03ac72941c7d74dbfba52aa)

		Comment on lines +172 to +173
		
		|   |
		|---|
		|model = DEFAULT_CONFIG.models.config;|
		|effort = DEFAULT_CONFIG.effort.config;|
		
		### 

		
		 **[![P1 Badge](https://camo.githubusercontent.com/c595229c0ecb6ee85b9c7804144d495f131a495ec87091fea2b262d954c9a92d/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f50312d6f72616e67653f7374796c653d666c6174)](https://camo.githubusercontent.com/c595229c0ecb6ee85b9c7804144d495f131a495ec87091fea2b262d954c9a92d/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f50312d6f72616e67653f7374796c653d666c6174) Use default Claude command when config parsing fails**
		
		The new recovery path only falls back `model`/`effort` after config parsing errors, but `runInteractive()` still resolves the CLI binary via `getClaudeCommand()`inside `getClaudePath` (`src/core/claude-runner.ts`). With a malformed `~/.raf/raf.config.json`, that second config read still throws before the interactive session starts, so `raf config` remains unusable as a repair path even after showing the fallback warning.

---

- [ ] add token tracker feature from 'raf do' to 'raf plan', display stat AFTER planning interactive session (combined with task 03)
- [ ] add --no-session-persistence to PR description generation and failure analysis Claude calls (like name-generator already has)
- [ ] add per-task model/effort frontmatter metadata to plan files, RAF reads and uses during execution; remove "no implementation details" restriction from planning prompts