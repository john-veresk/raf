# Project Decisions

## Should this be a single task or split?
Single task to re-run all E2E test phases, plus a separate config update task first.

## Should interactive flows (raf-dev plan --provider codex) be tested?
Yes, try interactive too — attempt raf-dev plan --provider codex interactively via PTY, documenting any difficulties.

## Which models to test?
Try all available models. User's Codex CLI now has: gpt-5.4, gpt-5.4-mini, gpt-5.3-codex, gpt-5.2-codex, gpt-5.2, gpt-5.1-codex-max, gpt-5.1-codex-mini.

## The configured default `gpt-5.3-codex-spark` doesn't exist in available models. Update config or just document?
Update the default config: use `gpt-5.3-codex` for easy/spark-tier tasks (nameGeneration, failureAnalysis, effort: low). User initially said gpt-5.4-mini but corrected to gpt-5.3-codex for easy tasks too.
