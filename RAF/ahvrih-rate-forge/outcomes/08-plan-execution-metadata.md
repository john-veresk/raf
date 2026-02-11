# Outcome: Add Per-Task Execution Metadata + Remove Effort Config

## Summary
Implemented Obsidian-style frontmatter for plan files with required `effort` metadata, introduced `effortMapping` config section, redefined `models.execute` as a ceiling and fallback, removed the legacy `effort.*` config section entirely, and relaxed planning prompt restrictions.

## Key Changes

### Types (`src/types/config.ts`)
- Removed `EffortConfig`, `EffortScenario`, `EffortLevel` types
- Removed `VALID_EFFORTS` constant
- Removed `effort` from `RafConfig` interface
- Added `TaskEffortLevel` type (`'low' | 'medium' | 'high'`)
- Added `EffortMappingConfig` type (`{ low: ClaudeModelName; medium: ClaudeModelName; high: ClaudeModelName }`)
- Added `VALID_TASK_EFFORTS` constant (`['low', 'medium', 'high']`)
- Updated `DEFAULT_CONFIG` with `effortMapping: { low: 'haiku', medium: 'sonnet', high: 'opus' }`

### Config Utilities (`src/utils/config.ts`)
- Removed `getEffort()` accessor
- Removed effort validation logic
- Added `effortMapping` to `VALID_TOP_LEVEL_KEYS`
- Added `effortMapping` validation (values must be valid model names)
- Added `getEffortMapping()` accessor
- Added `resolveEffortToModel(effort)` function
- Added `MODEL_TIER_ORDER` constant for tier comparison
- Added `getModelTier(modelName)` function:
  - Returns numeric tier: haiku=1, sonnet=2, opus=3
  - Extracts family from full model IDs (e.g., `claude-opus-4-6` → opus)
  - Unknown models default to tier 3 (no cap)
- Added `applyModelCeiling(resolvedModel, ceiling?)` function:
  - Caps resolved model to the ceiling tier
  - Uses `models.execute` as default ceiling

### Frontmatter Parser (`src/utils/frontmatter.ts`) - NEW FILE
- Parses Obsidian-style frontmatter from plan file content
- Format: `key: value` lines at top, terminated by `---` (no opening delimiter)
- Extracts `effort` (required) and `model` (optional) fields
- Case-insensitive effort values
- Returns warnings for invalid/unknown keys (doesn't throw)
- Handles missing delimiter gracefully (returns empty frontmatter)
- Detects markdown headings before delimiter (invalid frontmatter)

### State Derivation (`src/core/state-derivation.ts`)
- Added frontmatter parsing alongside dependency parsing
- Extended `DerivedTask` interface with:
  - `frontmatter?: PlanFrontmatter` - parsed metadata
  - `frontmatterWarnings?: string[]` - parsing warnings

### Do Command (`src/commands/do.ts`)
- Removed `getEffort()` usage
- Added `resolveTaskModel()` helper function:
  - Uses explicit `model` frontmatter if present
  - Falls back to `effort` → `effortMapping` resolution
  - Applies ceiling using `applyModelCeiling()`
  - Returns `{ model, source }` for logging
- Creates new `ClaudeRunner` per task with resolved model
- Logs missing frontmatter warnings
- Implements retry escalation: failed tasks retry with ceiling model

### Config Command (`src/commands/config.ts`)
- Removed `getEffort()` usage and fallback

### Claude Runner (`src/core/claude-runner.ts`)
- Removed `effortLevel` option from `ClaudeRunnerOptions`
- Removed `CLAUDE_CODE_EFFORT_LEVEL` env var injection

### Planning Prompts (`src/prompts/planning.ts`, `src/prompts/amend.ts`)
- Removed restrictive "Plan Output Style" section
- Removed "NO code snippets or implementation details" restrictions
- Added frontmatter format requirements with effort assessment guidelines:
  - `low` — trivial/mechanical changes, simple one-file edits
  - `medium` — well-scoped features, bug fixes, multi-file changes
  - `high` — architectural changes, complex logic, deep codebase understanding

### Documentation
- **`src/prompts/config-docs.md`**:
  - Removed entire `effort` section
  - Added `effortMapping` section with defaults and validation rules
  - Updated `models.execute` description to document ceiling/fallback behavior
- **`CLAUDE.md`**:
  - Updated "Plan File Structure" to include frontmatter format
  - Documented effort metadata and model resolution
  - Removed effort config references
  - Added ceiling behavior documentation

### Tests
- **`tests/unit/config.test.ts`**:
  - Removed effort config tests
  - Added `effortMapping` validation tests
  - Added `getModelTier()` tests
  - Added `applyModelCeiling()` tests
  - Added `resolveEffortToModel()` tests
- **`tests/unit/config-command.test.ts`**:
  - Updated tests to use `effortMapping` instead of `effort`
- **`tests/unit/frontmatter.test.ts`** - NEW FILE:
  - Comprehensive tests for frontmatter parsing
  - Valid frontmatter tests (effort, model, both)
  - No frontmatter tests (missing delimiter, empty content, markdown heading)
  - Warning tests (unknown keys, invalid values)
  - Edge cases (whitespace, tabs, multiple delimiters)
- **`tests/unit/claude-runner.test.ts`**:
  - Removed `effortLevel` tests
  - Updated to test environment passing without effort override
- **`tests/unit/claude-runner-interactive.test.ts`**:
  - Updated default model test to accept both short aliases and full model IDs
  - Updated environment test to not depend on user's env vars
- **`tests/unit/validation.test.ts`**:
  - Updated default model test to accept config-dependent values

## Acceptance Criteria Verification
- [x] The entire `effort.*` config section is removed (types, defaults, validation, accessors, env var)
- [x] `ClaudeRunner` no longer sets `CLAUDE_CODE_EFFORT_LEVEL`
- [x] Existing config files with `effort` are handled gracefully (rejected as unknown key with warning)
- [x] `effortMapping` config exists with sensible defaults (low→haiku, medium→sonnet, high→opus)
- [x] `models.execute` acts as a ceiling — resolved model is capped to this tier
- [x] Ceiling works correctly: opus plan + sonnet ceiling = sonnet execution
- [x] Under-ceiling works correctly: haiku plan + sonnet ceiling = haiku execution
- [x] Retry escalation: failed task retries use the ceiling model
- [x] Plan files with frontmatter are parsed correctly (effort and optional model extracted)
- [x] Plan files without frontmatter produce a warning and fall back to config model
- [x] Effort label in frontmatter correctly maps to a model via `effortMapping`
- [x] Explicit `model` in frontmatter takes precedence over `effort` mapping but is still subject to ceiling
- [x] Planning prompts no longer restrict implementation details
- [x] Planning prompts mandate effort frontmatter with assessment guidelines
- [x] Invalid frontmatter values produce a warning but don't block execution
- [x] Frontmatter parsing doesn't break existing plan files (backwards compatible)
- [x] Tests cover effort removal, effortMapping, ceiling logic, frontmatter parsing, and override logic
- [x] All 1273 tests pass
- [x] TypeScript builds successfully

<promise>COMPLETE</promise>
