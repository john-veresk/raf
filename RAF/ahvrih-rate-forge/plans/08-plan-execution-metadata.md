# Task: Add Per-Task Execution Metadata + Remove Effort Config

## Objective
Add Obsidian-style frontmatter to plan files with required effort metadata, introduce an effort-to-model mapping config, redefine `models.execute` as a ceiling, remove the legacy `effort.*` config section entirely, and relax planning prompt restrictions.

## Context
The philosophy is "plan with a smart model, execute with a less smart model when possible." Currently, all tasks execute with the same globally-configured model. By adding frontmatter metadata to plan files during the planning stage, the planner (typically Opus) can assess each task's complexity and recommend the appropriate execution model.

The config's role shifts from "pick one model for all tasks" to "set the budget ceiling." The planner recommends effort per task, which maps to a model via `effortMapping`. The final model is capped by `models.execute` (the ceiling). This gives users budget control while letting the planner differentiate tasks.

The existing `effort.*` config section (which maps to Claude CLI's `--effort` flag via `CLAUDE_CODE_EFFORT_LEVEL` env var) should be removed entirely — it's a separate concept from the task complexity "effort" label in plan frontmatter.

Additionally, the planning prompts currently contain restrictive wording that discourages implementation details in plans. This wording should be removed to allow the planning model to include whatever level of detail it deems appropriate.

## Dependencies
04

## Requirements

### Frontmatter Metadata in Plan Files
- Plan files MUST have Obsidian-style properties at the top, before the `# Task:` heading
- Format uses only a closing `---` delimiter (no opening delimiter):
  ```
  effort: medium
  ---
  # Task: ...
  ```
- `effort` is REQUIRED — a human-readable task complexity label (low/medium/high) that maps to a model. NOT Claude's `--effort` flag
- `model` is OPTIONAL — an explicit model override (short alias or full model ID) that bypasses the effort mapping entirely
- If both `model` and `effort` are present, `model` takes precedence over the effort mapping
- If frontmatter is missing (e.g., manually created plans), warn and fall back to the config default model

### Effort-to-Model Mapping
- New config section: `effortMapping` that maps complexity labels to model names
- Default mapping: `{ low: "haiku", medium: "sonnet", high: "opus" }`
- When a plan has `effort: medium`, RAF resolves it to the model from the mapping (e.g., sonnet)
- The mapping values follow the same validation as model names (short aliases or full model IDs)
- Add to `DEFAULT_CONFIG`, validation, config-docs.md

### Config as Ceiling + Fallback
- `models.execute` serves dual purpose:
  1. **Ceiling**: the maximum model tier allowed for task execution
  2. **Fallback**: the model used when a plan has no effort frontmatter (e.g., manually created plans, legacy plans)
- Model tier ordering: haiku < sonnet < opus (based on pricing — cheaper = lower tier)
- When frontmatter IS present: final model = `min(resolved_model, models.execute)` where "min" means the cheaper/lower-tier model
- When frontmatter is MISSING: final model = `models.execute` directly (with a warning about missing frontmatter)
- Example: if `models.execute: "sonnet"` (ceiling) and plan says `effort: high` (maps to opus), the task runs with sonnet (capped)
- Example: if `models.execute: "sonnet"` and plan says `effort: low` (maps to haiku), the task runs with haiku (under ceiling, no cap)
- Example: if plan has no frontmatter, the task runs with sonnet (fallback)
- The explicit `model` field in frontmatter is ALSO subject to the ceiling — no way to exceed the config ceiling from a plan file
- **Retry escalation**: when a task fails and is retried, bump the model to `models.execute` (the ceiling) for the retry attempt. If the first attempt already used the ceiling model, retry with the same model. This gives failing tasks the best available model on subsequent attempts
- Implement a `getModelTier()` utility that returns a numeric tier for comparison (using pricing ratios or a simple ordered list)

### Remove Legacy Effort Config
- Remove the entire `effort.*` config section from `RafConfig` interface in `src/types/config.ts`
- Remove `EffortConfig`, `EffortScenario`, `EffortLevel` types, `VALID_EFFORTS` constant
- Remove `getEffort()` accessor from `src/utils/config.ts`
- Remove effort validation logic from config validation
- Remove `effortLevel` option from `ClaudeRunner` run options in `src/core/claude-runner.ts`
- Remove `CLAUDE_CODE_EFFORT_LEVEL` env var injection from `ClaudeRunner`
- Remove all `getEffort()` call sites:
  - `src/commands/do.ts` — `getEffort('execute')` passed to runner options
  - `src/commands/config.ts` — `getEffort('config')` and its fallback
  - Any other call sites
- Remove effort from `src/prompts/config-docs.md`
- Update tests that reference effort config

### Planning Prompt Changes
- Remove the "Plan Output Style" section that says "CRITICAL: Plans should be HIGH-LEVEL and CONCEPTUAL" from both `src/prompts/planning.ts` and `src/prompts/amend.ts`
- Remove the restrictive bullet points: "Describe WHAT needs to be done, not HOW to code it", "NO code snippets or implementation details in plans"
- Replace with neutral guidance: plans can include whatever level of detail the planner deems helpful
- Add instructions that the planner MUST include effort frontmatter on every task, with guidance on how to assess complexity:
  - `low` — trivial/mechanical changes, simple one-file edits, config changes
  - `medium` — well-scoped feature work, bug fixes with clear plans, multi-file changes following existing patterns
  - `high` — architectural changes, complex logic, tasks requiring deep codebase understanding
- Document the frontmatter format (Obsidian-style, closing `---` only) in the prompt

## Implementation Steps
1. Remove the legacy effort config: delete `EffortConfig`, `EffortScenario`, `EffortLevel` types, `VALID_EFFORTS`, `getEffort()`, the `effort` key from `RafConfig` and `DEFAULT_CONFIG`, effort validation, `effortLevel` from `ClaudeRunner` run options, `CLAUDE_CODE_EFFORT_LEVEL` env var logic
2. Remove all `getEffort()` call sites in `do.ts`, `config.ts`, and anywhere else
3. Add new `effortMapping` config section: type definition, defaults (`{ low: "haiku", medium: "sonnet", high: "opus" }`), validation (values must be valid model names), accessor helper
4. Implement model tier comparison: a `getModelTier()` utility that returns a numeric rank based on the model family (haiku=1, sonnet=2, opus=3). For full model IDs, extract the family name. For unknown models, default to highest tier (no cap)
5. Redefine `models.execute` semantics: it now acts as ceiling + fallback. Update its documentation to reflect this
6. Create a frontmatter parser utility that extracts `model` and `effort` from plan file content (parse `key: value` lines before the closing `---` delimiter)
7. Integrate frontmatter parsing into `state-derivation.ts` alongside the existing `parseDependencies()` — store parsed metadata on the task state object
8. In `do.ts`, before each task execution, resolve the per-task model:
   - Read frontmatter `model` or resolve `effort` via `effortMapping`
   - Apply ceiling: `min(resolved_model, models.execute)` using tier comparison
   - Fall back to `models.execute` if no frontmatter (fallback role)
9. Implement retry escalation: when retrying a failed task, use `models.execute` (ceiling) instead of the original resolved model. The retry logic in `do.ts` should detect attempt > 1 and escalate
10. Modify `ClaudeRunner` or the task execution loop to support per-task model (consider creating a new runner instance per task if the model differs)
10. Update `src/prompts/planning.ts` — remove the restrictive "Plan Output Style" section, replace with neutral guidance, add required frontmatter format instructions with effort assessment criteria
11. Update `src/prompts/amend.ts` — same prompt changes
12. Update config-docs.md: remove effort section, add effortMapping section, update models.execute description to "ceiling"
13. Update CLAUDE.md: update "Plan File Structure" to include frontmatter, remove effort references, document ceiling behavior
14. Update/remove affected tests

## Acceptance Criteria
- [ ] The entire `effort.*` config section is removed (types, defaults, validation, accessors, env var)
- [ ] `ClaudeRunner` no longer sets `CLAUDE_CODE_EFFORT_LEVEL`
- [ ] Existing config files with `effort` are handled gracefully (warning or silent ignore)
- [ ] `effortMapping` config exists with sensible defaults (low→haiku, medium→sonnet, high→opus)
- [ ] `models.execute` acts as a ceiling — resolved model is capped to this tier
- [ ] Ceiling works correctly: opus plan + sonnet ceiling = sonnet execution
- [ ] Under-ceiling works correctly: haiku plan + sonnet ceiling = haiku execution
- [ ] Retry escalation: failed task retries use the ceiling model
- [ ] Plan files with frontmatter are parsed correctly (effort and optional model extracted)
- [ ] Plan files without frontmatter produce a warning and fall back to config model
- [ ] Effort label in frontmatter correctly maps to a model via `effortMapping`
- [ ] Explicit `model` in frontmatter takes precedence over `effort` mapping but is still subject to ceiling
- [ ] Planning prompts no longer restrict implementation details
- [ ] Planning prompts mandate effort frontmatter with assessment guidelines
- [ ] Invalid frontmatter values produce a warning but don't block execution
- [ ] Frontmatter parsing doesn't break existing plan files (backwards compatible)
- [ ] Tests cover effort removal, effortMapping, ceiling logic, frontmatter parsing, and override logic

## Notes
- The frontmatter parser should be lenient: ignore unknown keys, handle missing `---` delimiter gracefully, treat malformed properties as "no frontmatter" rather than erroring. The format is Obsidian-style: `key: value` lines at the top of the file, terminated by a `---` line (no opening delimiter).
- This task depends on task 04 (version/model display) since the per-task model override should be visible in the execution log line.
- The `parseDependencies()` function in `state-derivation.ts` already reads plan file content — the frontmatter parser can be called at the same point, avoiding a second file read.
- Removing effort config is a breaking change for users who have `effort.*` in their config file. The config validator should handle this gracefully (warn about unknown key, don't crash).
- Model tier comparison for full model IDs: extract the family name (e.g., `claude-opus-4-6` → `opus`) and use the same tier ordering. Unknown families should default to the highest tier so they're never accidentally capped.
- The ceiling concept also applies to the explicit `model` frontmatter field — a plan cannot exceed the user's configured budget. This is intentional: the user always has final say on cost.
