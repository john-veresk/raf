# RAF Configuration Reference

## Overview

RAF uses a JSON configuration file at `~/.raf/raf.config.json` to control its behavior. All keys are optional — only set what you want to change. Unset keys use sensible defaults.

The config is loaded once per process and cached. Changes take effect on the next RAF command invocation.

## File Format

The config file is a JSON object. All keys are optional at every level. User values are deep-merged with defaults: you can override a single nested key without specifying the entire object.

```json
{
  "models": {
    "plan": "opus"
  }
}
```

The above only changes `models.plan` — all other model settings keep their defaults.

## Config Reference

### `models` — Claude Model Selection

Controls which Claude model is used for each scenario. Values can be a short alias (`"sonnet"`, `"haiku"`, `"opus"`) or a full model ID.

**Model ID format**: Full model IDs follow the pattern `claude-{family}-{version}`, for example:
- `"claude-opus-4-5-20251101"` — Opus 4.5 from November 2025
- `"claude-opus-4-6"` — Opus 4.6 (latest)
- `"claude-sonnet-4-5-20250929"` — Sonnet 4.5 from September 2025
- `"claude-haiku-4-5-20251001"` — Haiku 4.5 from October 2025

**Short aliases**: Using aliases (`"opus"`, `"sonnet"`, `"haiku"`) automatically selects the latest version of that model family.

| Key | Default | Description |
|-----|---------|-------------|
| `models.plan` | `"opus"` | Model used for planning sessions (`raf plan`) |
| `models.execute` | `"opus"` | Ceiling model for task execution (`raf do`). Per-task models from effort frontmatter are capped to this tier. Also used as the fallback when a plan has no effort frontmatter. |
| `models.nameGeneration` | `"sonnet"` | Model used for generating project names |
| `models.failureAnalysis` | `"haiku"` | Model used for analyzing task failures |
| `models.prGeneration` | `"sonnet"` | Model used for generating PR titles and descriptions |
| `models.config` | `"sonnet"` | Model used for the interactive config editor (`raf config`) |

### `effortMapping` — Task Effort to Model Mapping

Maps task complexity labels (in plan frontmatter) to Claude models. When a plan file has `effort: medium`, RAF resolves the execution model using this mapping.

| Key | Default | Description |
|-----|---------|-------------|
| `effortMapping.low` | `"sonnet"` | Model for low-complexity tasks |
| `effortMapping.medium` | `"sonnet"` | Model for medium-complexity tasks |
| `effortMapping.high` | `"opus"` | Model for high-complexity tasks |

Values must be a short alias (`"sonnet"`, `"haiku"`, `"opus"`) or a full model ID.

**Interaction with `models.execute`**: The `models.execute` value acts as a ceiling. If a task's effort maps to a more expensive model than the ceiling, the ceiling model is used instead. This gives users budget control while allowing tasks to use cheaper models when appropriate.

Example:
```json
{
  "models": { "execute": "sonnet" },
  "effortMapping": { "low": "sonnet", "medium": "sonnet", "high": "opus" }
}
```
- Task with `effort: low` → sonnet (at ceiling)
- Task with `effort: medium` → sonnet (at ceiling)
- Task with `effort: high` → sonnet (capped to ceiling, not opus)

### `timeout` — Task Timeout

- **Type**: number (positive)
- **Default**: `60`
- **Description**: Timeout in minutes for each task execution. Must be a positive number.

### `maxRetries` — Maximum Retry Attempts

- **Type**: number (non-negative integer)
- **Default**: `3`
- **Description**: How many times RAF retries a failed task before giving up. Must be a non-negative integer (0 disables retries).

### `autoCommit` — Automatic Git Commits

- **Type**: boolean
- **Default**: `true`
- **Description**: When `true`, Claude automatically commits changes after completing each task. When `false`, changes are left uncommitted.

### `worktree` — Default Worktree Mode

- **Type**: boolean
- **Default**: `false`
- **Description**: When `true`, `raf plan` and `raf do` default to worktree mode (isolated git worktree). Can be overridden per-command with `--worktree` flag.

### `syncMainBranch` — Sync Main Branch with Remote

- **Type**: boolean
- **Default**: `true`
- **Description**: When `true`, RAF automatically syncs the main branch with the remote before worktree operations:
  - **Before worktree creation** (`raf plan --worktree`): Pulls the main branch from remote to ensure the worktree starts from the latest code
  - **Before PR creation** (post-execution "Create PR" action): Pushes the main branch to remote so the PR base is up to date

The main branch is auto-detected from `refs/remotes/origin/HEAD`, falling back to `main` or `master` if not set.

Failures in sync operations produce warnings but don't block the workflow. For example, if the local main branch has diverged from remote, the sync will warn and continue.

### `commitFormat` — Commit Message Templates

Controls the format of git commit messages. Templates use `{placeholder}` syntax for variable substitution.

| Key | Default | Description |
|-----|---------|-------------|
| `commitFormat.task` | `"{prefix}[{projectId}:{taskId}] {description}"` | Format for task completion commits |
| `commitFormat.plan` | `"{prefix}[{projectId}] Plan: {projectName}"` | Format for plan creation commits |
| `commitFormat.amend` | `"{prefix}[{projectId}] Amend: {projectName}"` | Format for plan amendment commits |
| `commitFormat.prefix` | `"RAF"` | Prefix string substituted into `{prefix}` placeholder |

#### Template Variables

**Task commits** (`commitFormat.task`):
- `{prefix}` — The value of `commitFormat.prefix`
- `{projectId}` — The 6-character project identifier (e.g., `abcdef`)
- `{taskId}` — The 2-character task identifier (e.g., `01`, `0a`)
- `{description}` — A concise description of what was accomplished

**Plan commits** (`commitFormat.plan`):
- `{prefix}` — The value of `commitFormat.prefix`
- `{projectId}` — The 6-character project identifier
- `{projectName}` — The human-readable project name (e.g., `fix-auth-bug`)

**Amend commits** (`commitFormat.amend`):
- `{prefix}` — The value of `commitFormat.prefix`
- `{projectId}` — The 6-character project identifier
- `{projectName}` — The human-readable project name

Unknown placeholders are left as-is in the output.

### `display` — Token Summary Display Options

Controls what information is shown in token usage summaries after tasks and in the grand total.

| Key | Default | Description |
|-----|---------|-------------|
| `display.showCacheTokens` | `true` | Show cache read/create token counts in summaries |

Example:

```json
{
  "display": {
    "showCacheTokens": true
  }
}
```

## Validation Rules

The config is validated when loaded. Invalid configs cause an error with a descriptive message. The following rules are enforced:

- **Unknown keys are rejected** at every nesting level. Typos like `"model"` instead of `"models"` will be caught.
- **Model values** (`models.*`, `effortMapping.*`) must be a short alias (`"sonnet"`, `"haiku"`, `"opus"`) or a full model ID matching the pattern `claude-{family}-{version}` (e.g., `"claude-sonnet-4-5-20250929"`).
- **`effortMapping` keys** must be `"low"`, `"medium"`, or `"high"`.
- **`timeout`** must be a positive finite number.
- **`maxRetries`** must be a non-negative integer.
- **`autoCommit`**, **`worktree`**, and **`syncMainBranch`** must be booleans.
- **`commitFormat` values** must be strings.
- **`display` values** (`showCacheTokens`) must be booleans.
- The config file must be valid JSON containing an object (not an array or primitive).

## CLI Precedence

CLI flags always override config values. For example:

- `raf do --model haiku` uses Haiku regardless of `models.execute` in config
- `raf plan --worktree` enables worktree mode regardless of the `worktree` config value

The precedence order is: **CLI flag > config file > default value**.

## Example Configs

### Minimal — Just Change the Default Model

```json
{
  "models": {
    "execute": "sonnet"
  }
}
```

Uses Sonnet instead of Opus for task execution. Everything else stays at defaults.

### Common — Cost-Conscious Setup

```json
{
  "models": {
    "plan": "sonnet",
    "execute": "sonnet"
  },
  "worktree": true
}
```

Uses Sonnet for planning and caps task execution at Sonnet (tasks with `effort: high` will use Sonnet instead of Opus). Defaults to worktree mode.

### Full — All Settings Explicit

```json
{
  "models": {
    "plan": "opus",
    "execute": "opus",
    "nameGeneration": "sonnet",
    "failureAnalysis": "haiku",
    "prGeneration": "sonnet",
    "config": "sonnet"
  },
  "effortMapping": {
    "low": "sonnet",
    "medium": "sonnet",
    "high": "opus"
  },
  "timeout": 60,
  "maxRetries": 3,
  "autoCommit": true,
  "worktree": false,
  "syncMainBranch": true,
  "commitFormat": {
    "task": "{prefix}[{projectId}:{taskId}] {description}",
    "plan": "{prefix}[{projectId}] Plan: {projectName}",
    "amend": "{prefix}[{projectId}] Amend: {projectName}",
    "prefix": "RAF"
  },
  "display": {
    "showCacheTokens": true
  }
}
```

This is equivalent to having no config file at all — all values match the defaults.

### Pinned Model Versions

```json
{
  "models": {
    "plan": "claude-opus-4-5-20251101",
    "execute": "claude-sonnet-4-5-20250929"
  }
}
```

Uses specific model versions for planning and execution. Useful for pinning to a known-good model version.

### Team Branding — Custom Commit Prefix

```json
{
  "commitFormat": {
    "prefix": "ACME"
  }
}
```

Commits will read `ACME[abcdef:01] Add login page` instead of `RAF[abcdef:01] Add login page`.

## Resetting to Defaults

To reset all settings to defaults, delete the config file:

```bash
rm ~/.raf/raf.config.json
```

To reset a single setting, remove its key from the config file. Any key not present in the file will use its default value.

---

## For Claude — Config Editing Session Instructions

This section contains instructions for Claude when operating as the interactive config editor during `raf config` sessions.

### Your Role

You are helping the user view and edit their RAF configuration. Be helpful, explain what each setting does when asked, and make changes accurately.

### Reading the Config

1. Read the current config file at `~/.raf/raf.config.json`
2. If the file does not exist, tell the user they have no custom config and all defaults are active
3. Show the user their current settings when asked, noting which are custom vs. default

### Making Changes

1. **Only change what the user asks for.** Never modify keys the user didn't mention.
2. **Write partial configs.** Only include keys that differ from defaults. If the user sets a value back to its default, remove that key.
3. **Validate before saving.** Ensure all values conform to the validation rules above before writing the file.
4. **Create the directory if needed.** If `~/.raf/` doesn't exist, create it before writing the file.
5. **Preserve existing keys.** Read the current file first, merge the user's changes, then write the result.

### Explaining Changes

After making a change, briefly confirm what was changed and what the effective value is. For example:

> Set `models.execute` to `"sonnet"`. Task execution will now use the Sonnet model instead of Opus.

### Showing Current Config

When the user asks to see their config, show:
1. Their custom settings (from the config file)
2. The effective resolved config (custom + defaults merged)

Distinguish between user-set values and defaults so the user knows what they've customized.

### Common User Requests

- **"Show my config"** — Read and display the config file, noting defaults
- **"Use sonnet for everything"** — Set all `models.*` keys to `"sonnet"`
- **"Reset to defaults"** — Delete the config file (confirm with user first)
- **"What does X do?"** — Explain the setting using the reference above
- **"Set timeout to 90"** — Update `timeout` to `90` in the config file
