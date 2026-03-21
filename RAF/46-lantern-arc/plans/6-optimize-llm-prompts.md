---
effort: high
---
# Task: Optimize LLM prompts for clarity and conciseness

## Objective
Review and optimize the three main prompt files (planning.ts, execution.ts, amend.ts) to remove redundancy, clarify confusing statements, and reduce verbosity while preserving clarity for LLMs.

## Dependencies
1, 2

## Context
The prompts in this project are sent to LLMs and should be optimized for how LLMs process instructions. Common issues include: repeated instructions across sections, contradictory or confusing statements, unnecessary verbosity that wastes tokens without adding clarity, and instructions that could be consolidated.

## Requirements
- Review all three prompt files: `src/prompts/planning.ts`, `src/prompts/execution.ts`, `src/prompts/amend.ts`
- Identify and remove redundant/repeated instructions
- Clarify confusing or ambiguous statements
- Reduce verbosity where possible without losing meaning
- Preserve all functional requirements — don't remove instructions that change behavior
- Keep the prompts well-structured and scannable

## Implementation Steps
1. Read `src/prompts/planning.ts` carefully and note:
   - Repeated instructions (same thing said in multiple places)
   - Confusing/contradictory statements
   - Overly verbose sections that could be tightened
2. Do the same for `src/prompts/execution.ts`
3. Do the same for `src/prompts/amend.ts`
4. Apply edits to each file:
   - Consolidate repeated instructions into a single clear statement
   - Rewrite confusing passages
   - Trim verbose sections while preserving intent
   - Ensure cross-references between prompts still make sense
5. After editing, re-read each prompt end-to-end to verify coherence
6. Note: Tasks 1 and 2 may have changed content in these files (spark alias removal, worktree cleanup from planning prompt). Work with the current state of the files.

## Acceptance Criteria
- [ ] No redundant/repeated instructions across sections within each prompt
- [ ] No confusing or contradictory statements
- [ ] Prompts are noticeably more concise
- [ ] All functional requirements are preserved
- [ ] TypeScript compiles without errors

## Notes
- This task depends on tasks 1 and 2 because those tasks modify content within the prompt files. This task should work with the already-cleaned-up versions.
- Focus on LLM readability, not human readability. LLMs process instructions differently — clear structure and non-redundancy matter more than prose style.
- Be conservative with the execution prompt — it's the most critical for correct task completion.
