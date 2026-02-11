# Task Outcome: Rewrite README benefits and add --amend vs --resume explanation

## Summary

Successfully enhanced the README to better communicate RAF's value proposition and clearly explain the difference between `--amend` and `--resume` flags.

## Changes Made

### 1. "Why RAF?" Section - Complete Rewrite

Replaced the brief, generic benefits section with comprehensive feature highlights:

**New benefits highlighted** (8 total):
1. **Smart model selection** — Automatic task routing based on effort estimation (low/medium/high), configurable via `effortMapping`
2. **Automatic PR creation** — Claude-generated PR descriptions with context from input, decisions, and outcomes
3. **Structured decision-making** — `decisions.md` artifacts give reviewers insight into the "why" behind changes
4. **Context isolation** — Fresh context per task, no degradation from long sessions
5. **Token efficiency** — Well-planned tasks avoid debugging cycles, planning overhead pays for itself
6. **Full auditability** — Complete thought process preserved as markdown (input, decisions, plans, outcomes)
7. **Retry with escalation** — Automatic retry with more capable model on failure
8. **Git worktree isolation** — Work on isolated branches with post-execution choice (merge/PR/leave)

**Old content**: 5 brief bullets focused mainly on human decisions and context rot
**New content**: 8 detailed benefits showcasing RAF's advanced capabilities

### 2. Added `--amend` vs `--resume` Explanation

Added new section under `raf plan` command (line 75-79):

**`--amend <id>`**:
- Adds new tasks to existing project
- Opens new planning session showing existing tasks with status
- Creates plans numbered after last task
- Use case: scope grows or extending completed project

**`--resume <id>`**:
- Resumes interrupted Claude planning session
- Opens Claude's session picker scoped to project directory
- Continue exact conversation where left off
- Use case: interrupted planning (Ctrl-C, network issue, etc.)

### 3. Features Section - Streamlined

Updated the Features bullet list to avoid redundancy with the new "Why RAF?" content:

**Old**: 7 items with some overlap with benefits
**New**: 6 consolidated items focusing on high-level capabilities rather than detailed benefits

Changes:
- "Interactive Planning" → more concise phrasing
- "Automated Execution" → "Smart Execution" (highlights model selection and retry)
- Added "Resume & Amend" as dedicated feature
- Consolidated git features into single "Git Integration" bullet
- "Configurable" → "Full Configurability" with example of what's configurable

## Verification

All acceptance criteria met:
- ✅ "Why RAF?" section highlights 8 key benefits including smart model selection, PR creation, and structured decisions (exceeds requirement of 6)
- ✅ `--amend` vs `--resume` difference clearly explained with use cases
- ✅ README reads well end-to-end — no contradictions or redundancy
- ✅ No broken markdown formatting (verified by reading rendered sections)
- ✅ Tone is confident and factual (showcases genuine capabilities without hype)
- ✅ All 1257 tests pass
- ✅ TypeScript compilation passes (`npm run lint`)

## Notes

- The new "Why RAF?" section is much more detailed and specific than before, providing concrete examples of RAF's capabilities
- The `--amend` vs `--resume` explanation is positioned right after the `raf plan` usage examples for easy discovery
- Features section was streamlined to complement rather than duplicate the benefits
- The Vision section remains unchanged — it provides philosophical context while "Why RAF?" now handles technical benefits
- All changes maintain the existing structure and flow of the README

<promise>COMPLETE</promise>
