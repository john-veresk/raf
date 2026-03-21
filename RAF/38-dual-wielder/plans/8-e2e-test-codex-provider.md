---
effort: high
---
# Task: E2E Test Codex Provider

## Objective
Verify the Codex provider integration works end-to-end by running `raf-dev plan` and `raf-dev do` with `--provider codex` against a dummy Node.js project, documenting all issues found.

## Context
This is a follow-up to task 3 (implement-codex-runner). See outcome: /Users/eremeev/projects/RAF/RAF/38-dual-wielder/outcomes/3-implement-codex-runner.md

Tasks 1-4 added Codex support (config schema, abstract runner, CodexRunner implementation, LLM-agnostic prompts) but none of this has been tested E2E against a real project. This task validates the full integration.

## Dependencies
3

## Requirements
- Create a simple dummy Node.js project to use as a test target
- Run `raf-dev plan` and `raf-dev do` with `--provider codex` and verify real behavior
- Use `raf-dev` (not `raf`) for all testing — this is the development binary
- Test all major scenarios: planning, execution, config/model resolution, error handling
- Document all issues found in the outcome — do NOT auto-create fix tasks
- Sequential testing is fine (no need for parallel agents)

## Implementation Steps

### Phase 1: Set up dummy project

1. Create a temporary dummy Node.js project folder (e.g., `/tmp/raf-codex-test-project/`) with:
   - `package.json` with a name and basic scripts
   - `src/index.ts` — a small file with a few intentional TODOs or bugs (e.g., a function that doesn't handle edge cases)
   - `tsconfig.json` — basic TypeScript config
   - Initialize a git repo in it (`git init && git add . && git commit`)
2. The project should be simple enough that an LLM can meaningfully plan and execute tasks against it

### Phase 2: Test `raf-dev plan --provider codex`

3. Run `raf-dev plan --provider codex` targeting the dummy project
   - Provide a simple input like "add input validation to the exported functions"
   - Verify: Does the PTY spawn correctly? Does Codex receive the prompt?
   - Verify: Are plan files generated with correct frontmatter?
   - Verify: Does the interactive planning session complete without crashes?
4. Check the generated plan files — are they well-formed? Do they have the expected structure?

### Phase 3: Test `raf-dev do --provider codex`

5. Run `raf-dev do --provider codex` on the planned project
   - Verify: Does task execution start correctly?
   - Verify: Is the `codex exec --full-auto --json --ephemeral` command constructed properly?
   - Verify: Does JSONL stream output display correctly in verbose mode?
   - Verify: Does completion detection work (outcome file, commit verification)?
   - Verify: Does the task complete and produce an outcome file?
6. Check the outcome files and any commits made — are they correct?

### Phase 4: Test config/model resolution

7. Test that `--provider codex` correctly overrides the default provider in config
8. Test effort-based model resolution for codex:
   - A plan with `effort: low` should use `gpt-5.3-codex-spark`
   - A plan with `effort: medium` should use `gpt-5.3-codex`
   - A plan with `effort: high` should use `gpt-5.4`
9. Test explicit model override in plan frontmatter (e.g., `model: codex/gpt-5.4`)

### Phase 5: Test error handling and edge cases

10. Test what happens when `codex` binary is not in PATH (temporarily rename or use a bad path)
11. Test timeout behavior — does a long-running task get terminated correctly?
12. Test that `runResume` correctly throws "not supported" for Codex
13. Test behavior with malformed/unexpected Codex output
14. Verify that usage data being `undefined` for Codex doesn't break any display or logging code

### Phase 6: Document results

15. Create a comprehensive outcome document listing:
    - Each scenario tested and its result (PASS/FAIL)
    - Detailed description of any failures or unexpected behavior
    - Severity assessment for each issue (critical/major/minor)
    - Suggested fixes for each issue found

## Acceptance Criteria
- [ ] Dummy Node.js project created and initialized with git
- [ ] `raf-dev plan --provider codex` tested and results documented
- [ ] `raf-dev do --provider codex` tested and results documented
- [ ] Config/model resolution tested for codex provider
- [ ] Error handling and edge cases tested
- [ ] Comprehensive outcome document listing all issues found with severity

## Notes
- This task requires the `codex` CLI to be installed and available in PATH
- If Codex CLI is not available, document that as the first finding and test what you can without it (e.g., error handling for missing binary, config resolution logic)
- Focus on documenting issues clearly — the user will decide what to fix based on the outcome
- When testing interactively (raf-dev plan), you may need to provide input via the PTY — document any difficulties with this
- Check `src/core/codex-runner.ts` for the actual command construction to verify correctness
- Check `src/core/runner-factory.ts` to verify provider routing
- Check `src/utils/config.ts` for model resolution logic
