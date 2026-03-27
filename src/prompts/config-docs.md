# RAF Configuration Reference

## Overview

RAF uses a JSON configuration file at `~/.raf/raf.config.json` to control its behavior. All keys are optional — only set what you want to change. Unset keys use sensible defaults.

The config is loaded once per process and cached. Changes take effect on the next RAF command invocation.

## File Format

The config file is a JSON object. All keys are optional at every level. User values are deep-merged with defaults: you can override a single nested key without specifying the entire object.

```json
{
  "models": {
    "plan": { "model": "sonnet", "harness": "claude" }
  }
}
```

The above only changes `models.plan` — all other model settings keep their defaults.

## Config Reference

### `models` — Model Selection

Controls which model and harness is used for each scenario. Each entry is a `ModelEntry` object with the following shape:

```json
{ "model": "<model-name>", "harness": "<harness>", "reasoningEffort": "<effort>", "fast": true }
```

- **`model`** (required): A short alias (`"sonnet"`, `"haiku"`, `"opus"`) or a full model ID (e.g., `"claude-opus-4-6"`, `"gpt-5.4"`, `"o3"`).
- **`harness`** (required): The CLI harness — `"claude"` or `"codex"`.
- **`fast`** (optional): Enable fast mode for faster output. Claude only — uses the same model with ~2.5x faster responses at higher per-token cost. Default: `false`/omitted. Codex does not support fast mode; RAF warns and ignores `fast: true` on Codex entries.
- **`reasoningEffort`** (optional): Controls reasoning depth. Accepted values differ by harness:
  - **Claude** (`output_config.effort`): `"low"`, `"medium"`, `"high"` (default), `"max"` (Opus 4.6 only). Supported on Opus 4.5+, Sonnet 4.6+. Haiku does not support reasoning.
  - **Codex** (`model_reasoning_effort`): `"none"`, `"minimal"`, `"low"`, `"medium"` (default), `"high"`, `"xhigh"`.

**Claude model aliases**: `"opus"`, `"sonnet"`, `"haiku"` automatically select the latest version.
**Known Codex models**: `"gpt-5.4"`, `"gpt-5.4-2026-03-05"` (pinned), `"gpt-5.4-pro"`, `"gpt-5.4-mini"`, `"gpt-5.4-nano"`, `"o3"`.

| Key | Default | Description |
|-----|---------|-------------|
| `models.plan` | `{ "model": "opus", "harness": "claude" }` | Model used for planning sessions (`raf plan`) |
| `models.execute` | `{ "model": "opus", "harness": "claude" }` | Ceiling model for task execution (`raf do`). Per-task models from effort frontmatter are capped to this tier. Also used as the fallback when a plan has no effort frontmatter. |
| `models.nameGeneration` | `{ "model": "sonnet", "harness": "claude" }` | Model used for generating project names |
| `models.failureAnalysis` | `{ "model": "haiku", "harness": "claude" }` | Model used for analyzing task failures |
| `models.prGeneration` | `{ "model": "sonnet", "harness": "claude" }` | Model used for generating PR titles and descriptions |
| `models.config` | `{ "model": "sonnet", "harness": "claude" }` | Model used for the interactive config editor (`raf config wizard`) |

**Partial overrides**: When deep-merging, you can override just the `model` or `harness` within an entry:

```json
{
  "models": {
    "execute": { "model": "gpt-5.4", "harness": "codex" }
  }
}
```

### `effortMapping` — Task Effort to Model Mapping

Maps task complexity labels (in plan frontmatter) to `ModelEntry` objects. When a plan file has `effort: medium`, RAF resolves the execution model using this mapping.

| Key | Default | Description |
|-----|---------|-------------|
| `effortMapping.low` | `{ "model": "sonnet", "harness": "claude" }` | Model for low-complexity tasks |
| `effortMapping.medium` | `{ "model": "opus", "harness": "claude" }` | Model for medium-complexity tasks |
| `effortMapping.high` | `{ "model": "opus", "harness": "claude" }` | Model for high-complexity tasks |

Each value is a `ModelEntry` object (same shape as `models.*` entries).

**Interaction with `models.execute`**: The `models.execute` value acts as a ceiling. If a task's effort maps to a more expensive model than the ceiling, the ceiling model is used instead. This gives users budget control while allowing tasks to use cheaper models when appropriate.

Example:
```json
{
  "models": { "execute": { "model": "sonnet", "harness": "claude" } },
  "effortMapping": {
    "low": { "model": "sonnet", "harness": "claude" },
    "medium": { "model": "opus", "harness": "claude" },
    "high": { "model": "opus", "harness": "claude" }
  }
}
```
- Task with `effort: low` → sonnet (at ceiling)
- Task with `effort: medium` → sonnet (capped to ceiling, not opus)
- Task with `effort: high` → sonnet (capped to ceiling, not opus)

**Mixed harnesses**: You can mix Claude and Codex models freely:
```json
{
  "effortMapping": {
    "low": { "model": "sonnet", "harness": "claude" },
    "high": { "model": "gpt-5.4", "harness": "codex" }
  }
}
```

### `codex` — Codex Execution Policy (`raf do`)

Controls which Codex execution mode RAF uses for non-interactive task execution in `raf do`.

| Key | Default | Description |
|-----|---------|-------------|
| `codex.executionMode` | `"dangerous"` | Execution mode for `codex exec` during `raf do` runs |

- **Type**: string
- **Allowed values**:
  - `"dangerous"`: Uses `--dangerously-bypass-approvals-and-sandbox` (unrestricted Codex mode)
  - `"fullAuto"`: Uses `--full-auto` (sandboxed workspace-write mode with on-request approvals)
- **Scope**: This affects non-interactive Codex task execution (`raf do`). Interactive Codex sessions are unchanged.

Example:
```json
{
  "codex": {
    "executionMode": "fullAuto"
  }
}
```

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
- **Description**: When `true`, RAF automatically commits changes after completing each task. When `false`, changes are left uncommitted.

### `worktree` — Default Worktree Mode

- **Type**: boolean
- **Default**: `false`
- **Description**: When `true`, `raf plan` defaults to worktree mode (isolated git worktree). `raf do` auto-detects worktree projects regardless of this setting.

### `syncMainBranch` — Sync Main Branch with Remote

- **Type**: boolean
- **Default**: `true`
- **Description**: When `true`, RAF automatically syncs the main branch with the remote before worktree operations:
  - **Before worktree creation** (`raf plan --worktree`): Pulls the main branch from remote to ensure the worktree starts from the latest code
  - **Before PR creation** (post-execution "Create PR" action): Pushes the main branch to remote so the PR base is up to date

The main branch is auto-detected from `refs/remotes/origin/HEAD`, falling back to `main` or `master` if not set.

Failures in sync operations produce warnings but don't block the workflow. For example, if the local main branch has diverged from remote, the sync will warn and continue.

### `pushOnComplete` — Push After Successful Execution

- **Type**: boolean
- **Default**: `false`
- **Description**: When `true`, RAF pushes the current branch to the remote after successful `raf do` execution:
  - **Non-worktree mode**: Pushes the current branch after all tasks complete successfully
  - **Worktree merge mode**: After merging the worktree branch, pushes the merged-into branch to remote
  - **Worktree PR mode**: No effect (PR creation already pushes the branch)
  - **Worktree leave mode**: No effect (no merge occurs)

Push failures produce warnings but don't fail the overall execution.

### `commitFormat` — Commit Message Templates

Controls the format of git commit messages. Templates use `{placeholder}` syntax for variable substitution.

| Key | Default | Description |
|-----|---------|-------------|
| `commitFormat.task` | `"{prefix}[{projectName}:{taskId}] {description}"` | Format for task completion commits |
| `commitFormat.plan` | `"{prefix}[{projectName}] Plan: {description}"` | Format for plan creation commits |
| `commitFormat.amend` | `"{prefix}[{projectName}] Amend: {description}"` | Format for plan amendment commits |
| `commitFormat.prefix` | `"RAF"` | Prefix string substituted into `{prefix}` placeholder |

#### Template Variables

**Task commits** (`commitFormat.task`):
- `{prefix}` — The value of `commitFormat.prefix`
- `{projectName}` — The project name extracted from the folder (e.g., `swiss-army` from `43-swiss-army`)
- `{projectId}` — Backwards-compatible alias for `{projectName}`
- `{taskId}` — The task number (e.g., `1`, `10`)
- `{description}` — A concise description of what was accomplished

**Plan commits** (`commitFormat.plan`):
- `{prefix}` — The value of `commitFormat.prefix`
- `{projectName}` — The project name extracted from the folder
- `{projectId}` — Backwards-compatible alias for `{projectName}`
- `{description}` — Auto-generated summary from input.md

**Amend commits** (`commitFormat.amend`):
- `{prefix}` — The value of `commitFormat.prefix`
- `{projectName}` — The project name extracted from the folder
- `{projectId}` — Backwards-compatible alias for `{projectName}`
- `{description}` — Auto-generated description of what was amended

Unknown placeholders are left as-is in the output.

### `presets` — Named Config Snapshots

Presets are named config files that you can save and link to. Once linked, config edits automatically persist back to the preset.

- **Storage**: `~/.raf/presets/<name>.json` — same format as `~/.raf/raf.config.json`
- **Flow**:
  1. `raf config set ...` creates a regular `~/.raf/raf.config.json`
  2. `raf config preset save <name>` moves the file to `presets/<name>.json` and symlinks `raf.config.json` to it
  3. From now on, `raf config set ...` writes directly to the preset file via the symlink
  4. `raf config preset load <other>` switches the symlink to a different preset
- **CLI commands**:
  - `raf config preset save <name>` — move config into a preset and link to it
  - `raf config preset load <name>` — switch the link to a different preset
  - `raf config preset list` — list all saved presets (marks the linked one)
  - `raf config preset delete <name>` — delete a preset (unlinks first if active)
- **Unlinking**: `raf config reset` removes the symlink and restores defaults. The preset file is not deleted.
- **Status**: `raf config get` shows `(linked: <name>)` when config is symlinked to a preset.
- **Name rules**: alphanumeric characters, hyphens, and underscores only (`^[a-zA-Z0-9_-]+$`)

## Valid Model Names

When configuring models, use one of the known names below. Aliases automatically resolve to the latest version.

### Claude Models (harness: `"claude"`)

| Alias | Resolves To | Notes |
|-------|------------|-------|
| `"opus"` | `claude-opus-4-6` | Most capable, highest cost |
| `"sonnet"` | `claude-sonnet-4-5-20250929` | Balanced capability and cost |
| `"haiku"` | `claude-haiku-4-5-20251001` | Fastest, lowest cost |

You can also use full model IDs directly for version pinning:
- `"claude-opus-4-6"`, `"claude-opus-4-5-20251101"`
- `"claude-sonnet-4-6"`, `"claude-sonnet-4-5-20250929"`
- `"claude-haiku-4-5-20251001"`

Any string matching the pattern `claude-<family>-*` is accepted as a valid Claude model ID.

### Codex Models (harness: `"codex"`)

| Alias | Resolves To | Notes |
|-------|------------|-------|
| `"codex"` | `gpt-5.3-codex` | Lightweight, fast |
| `"gpt54"` | `gpt-5.4` | Most capable Codex model |

You can also use raw Codex model IDs directly:
- `"gpt-5.4"`, `"gpt-5.4-2026-03-05"` (pinned), `"gpt-5.4-pro"`, `"gpt-5.4-mini"`, `"gpt-5.4-nano"`
- `"gpt-5.3-codex"`
- `"o3"`

Any string matching the pattern `gpt-<version>` or containing a dot-separated version number is accepted as a valid Codex model ID.

### Prefixed Format

You can also use `harness/model` format: `"claude/opus"`, `"codex/gpt-5.4"`. The harness prefix is stripped and used to set the harness field.

## Reasoning Effort

Reasoning effort controls how much thinking the model does before responding. Higher values produce more thorough responses but cost more tokens.

### Claude Reasoning Effort

- **Valid values**: `"low"`, `"medium"`, `"high"` (default), `"max"`
- **`"max"`** is only available on Opus 4.5+
- Supported on Opus 4.5+ and Sonnet 4.6+. Haiku does not support reasoning effort.
- Passed as the `--effort` flag to Claude CLI.

### Codex Reasoning Effort

- **Valid values**: `"none"`, `"minimal"`, `"low"`, `"medium"` (default), `"high"`, `"xhigh"`
- Passed as `-c model_reasoning_effort="<level>"` to Codex CLI.

### When to Adjust

- **Lower effort** (low/minimal): Simple tasks like renaming, formatting, or config changes. Saves cost and time.
- **Default effort** (medium/high): Good for most tasks. Balanced cost and quality.
- **Higher effort** (max/xhigh): Complex architectural decisions, subtle bugs, or security-sensitive code.

Reasoning effort is optional — omit it to use the harness's default.

## Fast Mode

Fast mode enables faster output from Claude by routing requests through a higher-priority serving path. It uses the same model but delivers responses roughly 2.5x faster at a higher per-token cost.

- **Claude only** — Codex does not support fast mode. RAF warns and ignores `fast: true` on Codex entries.
- **Default**: `false`/omitted (standard speed).
- Passed as `--settings '{"fastMode": true}'` to Claude CLI.
- Useful for interactive planning sessions where rapid iteration matters. For batch execution where cost efficiency is the priority, standard mode is recommended.

Example — fast planning, standard execution:
```json
{
  "models": {
    "plan": { "model": "opus", "harness": "claude", "fast": true },
    "execute": { "model": "opus", "harness": "claude" }
  }
}
```

## Validation Rules

The config is validated when loaded. Invalid configs cause an error with a descriptive message. The following rules are enforced:

- **Unknown keys are rejected** at every nesting level. Typos like `"model"` instead of `"models"` will be caught.
- **Removed legacy keys** (`provider`, `codexModels`, `codexEffortMapping`) are rejected with helpful migration messages.
- **Model entries** (`models.*`, `effortMapping.*`) must be `ModelEntry` objects with required `model` and `harness` fields. Plain strings (e.g., `"sonnet"`) are not accepted — use `{ "model": "sonnet", "harness": "claude" }` instead.
- **`effortMapping` keys** must be `"low"`, `"medium"`, or `"high"`.
- **`timeout`** must be a positive finite number.
- **`maxRetries`** must be a non-negative integer.
- **`autoCommit`**, **`worktree`**, **`syncMainBranch`**, and **`pushOnComplete`** must be booleans.
- **`codex.executionMode`** must be `"dangerous"` or `"fullAuto"`.
- **`commitFormat` values** must be strings.
- The config file must be valid JSON containing an object (not an array or primitive).

## Precedence

The harness for each model is set via the `harness` field in each `ModelEntry` in the config. There is no CLI flag to override harnesses at runtime.

The precedence order is: **config file > default value**.

## Example Configs

### Minimal — Just Change the Default Model

```json
{
  "models": {
    "execute": { "model": "sonnet", "harness": "claude" }
  }
}
```

Uses Sonnet instead of Opus for task execution. Everything else stays at defaults.

### Common — Cost-Conscious Setup

```json
{
  "models": {
    "plan": { "model": "sonnet", "harness": "claude" },
    "execute": { "model": "sonnet", "harness": "claude" }
  },
  "worktree": true
}
```

Uses Sonnet for planning and caps task execution at Sonnet (tasks with `effort: high` will use Sonnet instead of Opus). Defaults to worktree mode.

### Mixed Harnesses — Claude Planning, Codex Execution

```json
{
  "models": {
    "plan": { "model": "opus", "harness": "claude" },
    "execute": { "model": "gpt-5.4", "harness": "codex" }
  },
  "effortMapping": {
    "low": { "model": "sonnet", "harness": "claude" },
    "high": { "model": "gpt-5.4", "harness": "codex" }
  }
}
```

Uses Claude Opus for planning but Codex for execution. Low-effort tasks use Claude Sonnet, high-effort tasks use Codex.

### Full — All Settings Explicit

```json
{
  "models": {
    "plan": { "model": "opus", "harness": "claude" },
    "execute": { "model": "opus", "harness": "claude" },
    "nameGeneration": { "model": "sonnet", "harness": "claude" },
    "failureAnalysis": { "model": "haiku", "harness": "claude" },
    "prGeneration": { "model": "sonnet", "harness": "claude" },
    "config": { "model": "sonnet", "harness": "claude" }
  },
  "effortMapping": {
    "low": { "model": "sonnet", "harness": "claude" },
    "medium": { "model": "opus", "harness": "claude" },
    "high": { "model": "opus", "harness": "claude" }
  },
  "codex": {
    "executionMode": "dangerous"
  },
  "timeout": 60,
  "maxRetries": 3,
  "autoCommit": true,
  "worktree": false,
  "syncMainBranch": true,
  "pushOnComplete": false,
  "commitFormat": {
    "task": "{prefix}[{projectName}:{taskId}] {description}",
    "plan": "{prefix}[{projectName}] Plan: {description}",
    "amend": "{prefix}[{projectName}] Amend: {description}",
    "prefix": "RAF"
  }
}
```

This is equivalent to having no config file at all — all values match the defaults.

### Pinned Model Versions

```json
{
  "models": {
    "plan": { "model": "claude-opus-4-5-20251101", "harness": "claude" },
    "execute": { "model": "claude-sonnet-4-5-20250929", "harness": "claude" }
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

Commits will read `ACME[my-project:1] Add login page` instead of `RAF[my-project:1] Add login page`.

## Resetting to Defaults

To reset all settings to defaults, run:

```bash
raf config reset
```

This deletes `~/.raf/raf.config.json` after confirmation.

To reset a single setting, remove its key from the config file or set it back to the default with `raf config set <key> <value>`. Any key not present in the file will use its default value.

---

## Config Editing Session Instructions

This section contains instructions for the LLM when operating as the interactive config editor during `raf config wizard` sessions.

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

> Set `models.execute` to `{ "model": "sonnet", "harness": "claude" }`. Task execution will now use the Sonnet model instead of Opus.

### Showing Current Config

When the user asks to see their config, show:
1. Their custom settings (from the config file)
2. The effective resolved config (custom + defaults merged)

Distinguish between user-set values and defaults so the user knows what they've customized.

### Validating Model Names

When the user specifies a model name, check it against the "Valid Model Names" section above:

1. **Known alias or full ID** — Accept it and proceed.
2. **Unknown model name** — Warn the user that the name isn't in the known list. Suggest they double-check the name. If you have web search capabilities (WebSearch tool), offer to search for the model name to verify it exists. If web search is not available, tell the user to verify the name themselves before saving.
3. **Common mistakes** — Watch for typos like `"claude-sonnet"` (missing version), `"gpt5.4"` (missing hyphen), or `"Opus"` (capitalized). Suggest the correct form.

When configuring reasoning effort, validate that the value is appropriate for the harness:
- Claude: `"low"`, `"medium"`, `"high"`, `"max"`
- Codex: `"none"`, `"minimal"`, `"low"`, `"medium"`, `"high"`, `"xhigh"`

If the user sets reasoning effort on a model that may not support it (e.g., Haiku), warn them.

### Managing Presets

Presets are stored at `~/.raf/presets/<name>.json`. After saving or loading a preset, `~/.raf/raf.config.json` is a **symlink** to the preset file — edits write through automatically.

#### Symlink Rules

When managing presets via file operations, you MUST follow these rules:

1. **Detect link state first**: Before any preset operation, check if `~/.raf/raf.config.json` is a symlink using `fs.lstatSync()`. `fs.existsSync()` follows symlinks and won't tell you if the path is a symlink.
2. **Reading config**: `fs.readFileSync()` follows symlinks automatically — just read `~/.raf/raf.config.json` as normal.
3. **Writing config**: `fs.writeFileSync()` follows symlinks — writes go to the preset file. This is correct behavior.
4. **Removing config**: `fs.unlinkSync()` on a symlink removes the **link itself**, not the target preset file.
5. **Broken symlinks**: If `~/.raf/raf.config.json` is a symlink but the target preset was deleted, `fs.existsSync()` returns false. Use `fs.lstatSync()` to detect this. Treat broken symlinks as "no config" (defaults).

#### Preset Operations

- **Save a preset** (`raf config preset save <name>`):
  1. Read config content from `~/.raf/raf.config.json` (follows symlink if linked)
  2. If already linked to the same preset name → no-op, tell the user
  3. Validate content, write to `~/.raf/presets/<name>.json`
  4. Remove `~/.raf/raf.config.json` (regular file or old symlink)
  5. Create symlink: `~/.raf/raf.config.json` → `~/.raf/presets/<name>.json`

- **Load a preset** (`raf config preset load <name>`):
  1. Validate `~/.raf/presets/<name>.json` exists and contains valid config
  2. Remove `~/.raf/raf.config.json` (regular file or old symlink)
  3. Create symlink: `~/.raf/raf.config.json` → `~/.raf/presets/<name>.json`

- **List presets**: Read `~/.raf/presets/` directory. Check if `~/.raf/raf.config.json` is a symlink pointing into `~/.raf/presets/` — if so, mark that preset as `(linked)`.

- **Delete a preset**: If the preset is currently linked (symlink target), remove the symlink at `~/.raf/raf.config.json` first. Then delete `~/.raf/presets/<name>.json`.

- **Unlink** (restore defaults): Remove the symlink at `~/.raf/raf.config.json`. The preset file is NOT deleted. Config falls back to defaults.

Validate preset names against `^[a-zA-Z0-9_-]+$` before saving. Apply the same validation rules to preset content as to the main config.

### Common User Requests

- **"Show my config"** — Read and display the config file, noting defaults
- **"Use sonnet for everything"** — Set all `models.*` entries to `{ "model": "sonnet", "harness": "claude" }`
- **"Reset to defaults"** — Delete the config file (confirm with user first)
- **"What does X do?"** — Explain the setting using the reference above
- **"Set timeout to 90"** — Update `timeout` to `90` in the config file
- **"Save this as a preset"** — Ask for a name, save content to `~/.raf/presets/<name>.json`, create symlink from `~/.raf/raf.config.json`
- **"Load preset X"** — Switch symlink from `~/.raf/raf.config.json` to `~/.raf/presets/X.json`
- **"Unlink preset"** — Remove the symlink at `~/.raf/raf.config.json` to restore defaults
- **"Show my presets"** — List all `.json` files in `~/.raf/presets/`
