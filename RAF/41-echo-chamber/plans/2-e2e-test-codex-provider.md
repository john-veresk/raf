---
effort: high
---
# Task: E2E Test Codex Provider (Post-Fix Verification)

## Objective
Verify that all 3 issues found in RAF[38:8] are fixed and that the Codex provider works end-to-end, including interactive flows.

## Context
RAF[38:8] E2E testing found 3 issues:
1. **CRITICAL**: JSONL stream renderer parsed wrong event format → Fixed in commit `d3ad381`
2. **CRITICAL**: `--provider` CLI flag was a no-op → Fixed in commit `1c55657`
3. **MAJOR**: Error events silently swallowed → Fixed in commit `d3ad381`

This task re-runs all scenarios to confirm the fixes work with real Codex CLI output.

## Dependencies
1

## Requirements
- Use `raf-dev` (not `raf`) for all testing
- Test ALL major scenarios: planning, execution, config/model resolution, error handling
- Test interactive flows (`raf-dev plan --provider codex`) this time — document any PTY difficulties
- Try all available models to verify they work: gpt-5.4, gpt-5.4-mini, gpt-5.3-codex
- Document all results in the outcome with PASS/FAIL per scenario
- Do NOT auto-create fix tasks — just document issues

## Implementation Steps

### Phase 1: Set up dummy project
1. Create a temporary dummy Node.js project at `/tmp/raf-codex-test-project/` with:
   - `package.json` with name and basic scripts
   - `src/index.ts` — a small file with intentional TODOs
   - `tsconfig.json` — basic TypeScript config
   - Initialize git repo (`git init && git add . && git commit`)

### Phase 2: Verify Fix #1 — JSONL Stream Renderer (was CRITICAL)
2. Write a small Node.js script that imports and tests `codex-stream-renderer.ts` directly with real Codex event formats:
   - `{"type":"item.completed","item":{"type":"agent_message","text":"hello"}}` → should produce display + textContent
   - `{"type":"item.completed","item":{"type":"command_execution","command":"ls","exit_code":0}}` → should produce display
   - `{"type":"error","message":"something failed"}` → should produce error display
   - `{"type":"turn.failed","reason":"timeout"}` → should produce failure display
   - `{"type":"turn.completed","usage":{"input_tokens":100,"output_tokens":50}}` → should capture usage
3. Verify each produces non-empty output (the bug was all events hitting the default case and producing empty output)

### Phase 3: Verify Fix #2 — `--provider` CLI Flag (was CRITICAL)
4. Run `raf-dev do --provider codex` on the dummy project and verify:
   - The `--provider` flag is actually read from Commander options
   - `createRunner()` receives `provider: 'codex'`
   - A `CodexRunner` is instantiated (not `ClaudeRunner`)
   - The codex CLI binary is invoked (not claude)
5. Check `src/commands/do.ts` and `src/commands/plan.ts` to confirm `options.provider` is read and forwarded

### Phase 4: Verify Fix #3 — Error Events (was MAJOR)
6. Test with an invalid/unavailable model to trigger Codex error output
7. Verify error messages are displayed to the user (not silently swallowed)

### Phase 5: Test `raf-dev do --provider codex` (full flow)
8. Create a simple plan file in the dummy project with `effort: medium`
9. Run `raf-dev do --provider codex` and verify:
   - Task execution starts correctly
   - `codex exec --full-auto --json --ephemeral -m <model>` command is constructed properly
   - JSONL stream output displays correctly in verbose mode
   - Task completes and produces an outcome file
   - Any commits are created correctly

### Phase 6: Test `raf-dev plan --provider codex` (interactive)
10. Run `raf-dev plan --provider codex` targeting the dummy project
    - Provide a simple input like "add input validation to the exported functions"
    - Verify: Does the PTY spawn correctly? Does Codex receive the prompt?
    - Verify: Are plan files generated with correct frontmatter?
    - Document any difficulties with PTY interaction

### Phase 7: Test model resolution with available models
11. Test effort-based model resolution:
    - `effort: low` → should use `gpt-5.3-codex` (updated in task 1)
    - `effort: medium` → should use `gpt-5.3-codex`
    - `effort: high` → should use `gpt-5.4`
12. Test explicit model override in plan frontmatter (e.g., `model: codex/gpt-5.4`)
13. Try running with different models to verify they work: gpt-5.4, gpt-5.4-mini, gpt-5.3-codex

### Phase 8: Document results
14. Create outcome document with:
    - Each scenario tested and PASS/FAIL
    - Detailed description of any failures
    - Severity assessment for new issues
    - Comparison with RAF[38:8] results (which issues are now fixed)

## Acceptance Criteria
- [ ] All 3 previously-found issues verified as fixed
- [ ] JSONL stream renderer correctly parses real Codex events
- [ ] `--provider codex` flag correctly routes to CodexRunner
- [ ] Error events displayed (not silently swallowed)
- [ ] `raf-dev do --provider codex` tested end-to-end
- [ ] `raf-dev plan --provider codex` interactive flow attempted and documented
- [ ] Model resolution tested with available models
- [ ] Comprehensive outcome document created

## Notes
- This task requires the `codex` CLI to be installed and available in PATH
- The key files to check: `src/core/codex-runner.ts`, `src/parsers/codex-stream-renderer.ts`, `src/core/runner-factory.ts`, `src/commands/do.ts`, `src/commands/plan.ts`
- Previous outcome for reference: `/Users/eremeev/projects/RAF/RAF/38-dual-wielder/outcomes/8-e2e-test-codex-provider.md`
- Fixes applied in commits: `d3ad381` (renderer + error handling), `1c55657` (--provider flag wiring)
