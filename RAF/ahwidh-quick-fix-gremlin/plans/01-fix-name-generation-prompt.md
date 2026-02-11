effort: low
---
# Task: Fix project name generation prompt

## Objective
Fix the multi-name generation prompt so Haiku doesn't output preamble text as the first "name" option.

## Context
When using Haiku for name generation (`models.nameGeneration: haiku`), the model outputs a preamble like "I'll generate 5 creative project names with differ..." before the actual names. This preamble gets sanitized into a long kebab-case string and appears as the first option in the picker. The prompt needs stronger instructions to prevent this.

## Requirements
- Tighten the `MULTI_NAME_GENERATION_PROMPT` in `src/utils/name-generator.ts` to prevent preamble
- Also tighten the single `NAME_GENERATION_PROMPT` for consistency
- Do NOT change the parsing logic (user chose prompt-only fix)
- Must work reliably with Haiku, Sonnet, and Opus models

## Implementation Steps

1. **Edit `src/utils/name-generator.ts`** — Update `MULTI_NAME_GENERATION_PROMPT` (line 22):
   - Move the output format instruction to the very beginning of the prompt
   - Add explicit "Do NOT include any introduction, explanation, or preamble" instruction
   - Remove the numbered style descriptions (they encourage Haiku to narrate)
   - Simplify to a direct instruction format. Example approach:
     ```
     Output EXACTLY 5 project names, one per line. No introductions, no explanations, no numbering, no quotes.

     Rules:
     - Each name: 1-3 words, kebab-case, lowercase with hyphens only
     - Use varied styles: metaphorical, playful, action-oriented, abstract, cultural reference
     - Make them memorable and evocative
     - For projects with many unrelated tasks, prefer abstract/metaphorical names

     Project description:
     ```

2. **Update `NAME_GENERATION_PROMPT`** (line 6) similarly:
   - Lead with the output format constraint
   - Add "No introduction, no explanation" reinforcement

3. **Update tests** if any exist in `tests/unit/name-generator.test.ts` that assert on the prompt text

## Acceptance Criteria
- [ ] Multi-name prompt starts with output format instruction
- [ ] Prompt explicitly forbids preamble/introduction text
- [ ] Numbered style descriptions removed or simplified to avoid narration
- [ ] Single-name prompt similarly tightened
- [ ] Existing tests pass

## Notes
- The parsing already strips numbering prefixes and quotes, but can't distinguish a preamble sentence from a valid name
- Haiku is particularly prone to prefacing its response with context
- The key insight: put the output format constraint FIRST, before the creative instructions
