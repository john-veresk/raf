# Project Decisions

## Where should the 5h window rate limit percentage be displayed?
Per-task + total — show running 5h window % after each task AND in the final total summary.

## Should the Sonnet baseline cap (88,000) be configurable?
Yes, configurable — add a config key so users can adjust the Sonnet-equivalent token cap.

## Should display toggles (rate limit %, cache tokens) be top-level or nested?
Nested under `display` section — e.g., `display.showRateLimitEstimate: true`, `display.showCacheTokens: true`.

## What approach for fixing mixed-attempt cost underreporting?
Per-attempt cost — calculate cost for each attempt independently, then sum. Each attempt uses per-model if available, aggregate-fallback otherwise.

## Should the branch name be configurable for worktree mode?
No — the user clarified that "branch name" referred to the **main branch** (main, master, etc.) that gets pushed/pulled, not the worktree feature branch. Main branch should be auto-detected from `origin/HEAD`.

## How should RAF version be displayed in `raf do` logs?
Single combined line at the start of execution — e.g., `RAF v2.3.0 | Model: claude-opus-4-6 | Effort: high`.

## Should `claudeCommand` be removed entirely or deprecated?
Remove entirely — always use 'claude' as the command name, remove the config key, accessor, and all references.

## Does removing `claudeCommand` also fix the PR #4 review comment about `raf config` fallback?
Yes — removing `claudeCommand` means `getClaudePath()` will hardcode 'claude', so it can't throw due to broken config. No separate task needed; verification included in the removal task.

## Should push-main and pull-main be controlled by one config key or two?
Single key — `syncMainBranch: true` controls both pushing main before PR and pulling main before worktree creation.

## For the main branch: config key or auto-detect?
Auto-detect from `origin/HEAD` — no config key needed.

## What scope for the README sync task?
Critical only — fix `--merge` flag references, document the post-execution picker, and document PR creation from worktree. Defer medium/low items.

## How should token tracking work for `raf plan` interactive sessions?
Parse Claude CLI's session JSONL file after the interactive session ends. Pass `--session-id <uuid>` to `runInteractive()` so we know exactly which file to read. Session files are stored at `~/.claude/projects/<escaped-path>/<session-id>.jsonl` and contain usage data in assistant message entries.

## Should token tracking for `raf plan` be a separate task or combined?
Combined with task 03 (rate-limit-estimation) since it touches the same token tracking and display infrastructure.

## Should `--no-session-persistence` be added to PR description generation only, or also failure analysis?
Both — add `--no-session-persistence` to both `callClaudeForPrBody()` in `pull-request.ts` AND the failure analyzer in `failure-analyzer.ts`. Both are throwaway Claude calls that shouldn't pollute session history.

## Model recommendation for all tasks in this project?
All tasks are well-suited for Sonnet. Plans are detailed enough that none require Opus-level reasoning.

## What format for model/effort markers in plan files?
Obsidian-style properties at the top of the plan file with only a closing `---` delimiter. E.g., `model: sonnet` and `effort: medium`.

## Should RAF use plan frontmatter markers during execution?
Yes — RAF reads `model` from the plan frontmatter to override the global config per-task. The `effort` field is a human-readable complexity label (not Claude's `--effort` flag) that maps to a model via a configurable mapping (e.g., `low` → haiku, `medium` → sonnet, `high` → opus).

## What does `effort` in plan frontmatter mean?
It is a human-readable task complexity label, NOT Claude's `--effort` parameter. There is a configurable mapping from effort labels to models (e.g., `effortMapping: { low: "haiku", medium: "sonnet", high: "opus" }`). If both `model` and `effort` are in the frontmatter, `model` takes precedence.

## Should the `effort.*` config section (Claude's --effort flag) be removed?
Yes — remove the entire `effort.*` config section, the `EffortConfig` type, `EffortScenario` type, `VALID_EFFORTS`, `getEffort()` accessor, and all `CLAUDE_CODE_EFFORT_LEVEL` env var usage. Claude CLI will use its own default effort level.

## How detailed should plans be regarding implementation?
Neutral — remove the "no implementation details" restriction from planning prompts, but don't actively encourage code snippets. Let the planning model decide the appropriate detail level naturally.

## How should config and plan frontmatter interact for model selection?
Config as ceiling. `models.execute` is redefined as the **maximum model tier** allowed for task execution. The planner sets `effort` per task (required), which maps to a model via `effortMapping`. The final execution model is `min(mapped model, models.execute)` where "min" means the cheaper/lower-tier model. This gives users budget control while letting the planner differentiate task complexity. Model tier ordering: haiku < sonnet < opus.

## Should plan frontmatter effort be required or optional?
Required — the planning prompt mandates effort frontmatter on every task. If missing (e.g., manually created plans), warn and fall back to the config default.

## What happens on retry when a task used a cheaper model?
Bump to ceiling — on retry, use `models.execute` (the ceiling model) instead of the original frontmatter-resolved model. If the first attempt was already at the ceiling, retry with the same model.
