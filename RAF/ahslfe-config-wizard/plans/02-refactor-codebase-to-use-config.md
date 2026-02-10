# Task: Refactor Codebase to Use Config

## Objective
Replace all hardcoded settings throughout the codebase with config lookups using the schema from task 01.

## Context
The codebase has hardcoded model names, effort levels, timeouts, commit formats, and other settings scattered across many files. This task wires everything up to use the centralized config system.

## Dependencies
01

## Requirements
- Every previously hardcoded user-facing setting must read from config
- CLI flags (--model, --timeout, etc.) still override config values
- Precedence: CLI flag > `~/.raf/raf.config.json` > built-in defaults
- No behavioral changes — existing defaults preserved, just sourced from config now

### Files and values to refactor:

**Model references:**
- `src/utils/name-generator.ts` — hardcoded `'sonnet'` → `config.models.nameGeneration`
- `src/core/failure-analyzer.ts` — hardcoded `'haiku'` → `config.models.failureAnalysis`
- `src/core/pull-request.ts` — hardcoded `'sonnet'` → `config.models.prGeneration`
- `src/core/claude-runner.ts` — default `'opus'` → `config.models.execute`
- `src/utils/validation.ts` — default model `'opus'` → `config.models.plan` or `config.models.execute` depending on context
- `src/commands/plan.ts` — model resolution → config.models.plan as default
- `src/commands/do.ts` — model resolution → config.models.execute as default

**Effort levels:**
- `src/commands/do.ts` — hardcoded `'medium'` → `config.effort.execute`
- Pass effort to name-generator, failure-analyzer, PR-generator from config

**Timeouts:**
- `src/commands/do.ts` — default `'60'` → `config.timeout`
- `src/utils/name-generator.ts` — `30000` timeout
- `src/core/failure-analyzer.ts` — `60000` timeout
- `src/core/pull-request.ts` — `120000` timeout

**Commit formats:**
- `src/prompts/execution.ts` — task commit format → `config.commitFormat.task` template
- `src/core/git.ts` — plan/amend commit formats → `config.commitFormat.plan` / `config.commitFormat.amend` templates
- Implement a `renderCommitMessage(template, vars)` utility that replaces `{placeholder}` tokens

**Worktree default:**
- `src/commands/plan.ts` — default worktree flag → `config.worktree`
- `src/commands/do.ts` — default worktree flag → `config.worktree`

**Other:**
- `src/commands/do.ts` — maxRetries, autoCommit → config values
- `src/utils/config.ts` — `claudeCommand` → config value

## Implementation Steps
1. Identify all call sites that need config access — use the file/line references above
2. Create a `renderCommitMessage(template, variables)` utility for commit format templates
3. Update each file to import and use config helpers instead of hardcoded values
4. Ensure CLI flags take precedence: where a CLI flag is provided, use it; otherwise fall back to config
5. Update the planning system prompt to include the configured commit format (so Claude knows what format to use)
6. Update the execution system prompt similarly
7. Write tests verifying that config values are respected and CLI flags override them
8. Test that default behavior is unchanged when no config file exists

## Acceptance Criteria
- [ ] No hardcoded model names remain in execution paths (only in DEFAULT_CONFIG)
- [ ] No hardcoded effort levels remain in execution paths
- [ ] Commit format uses templates from config
- [ ] CLI flags override config values
- [ ] Behavior is identical to before when no config file exists (defaults match current hardcoded values)
- [ ] All existing tests still pass
- [ ] New tests verify config integration

## Notes
- Be careful with the precedence chain — some values go through multiple layers (CLI → command → runner)
- The commit format in system prompts needs to be dynamically generated, not static strings
- Don't change internal constants (poll intervals, grace periods, char limits) — those stay hardcoded per the decisions
