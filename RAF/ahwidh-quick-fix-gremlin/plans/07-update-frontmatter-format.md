---
effort: medium
---
# Task: Update plan frontmatter to standard Obsidian format

## Objective
Change the plan file frontmatter format from closing-delimiter-only to standard Obsidian/YAML frontmatter with both opening and closing `---` delimiters.

## Context
Currently plan files use a non-standard format with only a closing `---`:
```
effort: medium
---
# Task: ...
```

Standard Obsidian (and Jekyll/Hugo/etc.) frontmatter uses `---` on both top and bottom:
```
---
effort: medium
---
# Task: ...
```

This change aligns RAF with the widely-used standard format, improving compatibility with Obsidian and other markdown tools.

## Requirements
- Update the frontmatter parser to support the standard `---`/`---` format
- Also keep backward compatibility with the old closing-only format (existing plan files should still parse)
- Update all prompts that instruct Claude to generate frontmatter
- Update CLAUDE.md documentation
- Update existing plan files in this project to use the new format (if any are being generated)

## Implementation Steps

1. **Edit `src/utils/frontmatter.ts`** — Update `parsePlanFrontmatter()` to handle both formats:
   - Check if content starts with `---` (after optional leading whitespace/newline)
   - If it does: standard format — find the closing `---` after it, extract content between the two delimiters
   - If it doesn't: legacy format — find the first `---` and treat everything before it as frontmatter (current behavior)

   Updated parsing logic:
   ```typescript
   export function parsePlanFrontmatter(content: string): FrontmatterParseResult {
     const result: FrontmatterParseResult = { frontmatter: {}, hasFrontmatter: false, warnings: [] };
     const trimmedContent = content.trimStart();

     let frontmatterSection: string;

     if (trimmedContent.startsWith('---')) {
       // Standard format: ---\nkey: value\n---
       const afterOpener = trimmedContent.substring(3);
       // Skip the rest of the opener line (handles "---\n" or "--- \n")
       const openerEnd = afterOpener.indexOf('\n');
       if (openerEnd === -1) return result;
       const rest = afterOpener.substring(openerEnd + 1);
       const closerIndex = rest.indexOf('---');
       if (closerIndex === -1) return result;
       frontmatterSection = rest.substring(0, closerIndex);
     } else {
       // Legacy format: key: value\n---
       const delimiterIndex = content.indexOf('---');
       if (delimiterIndex === -1) return result;
       frontmatterSection = content.substring(0, delimiterIndex);
     }

     // ... rest of key: value parsing remains the same
   }
   ```

2. **Update prompts** — Edit these files to show the new format with opening `---`:
   - `src/prompts/planning.ts` — Update the frontmatter example/instructions
   - `src/prompts/amend.ts` — Same update
   - Search for any other prompts that reference frontmatter format

3. **Update CLAUDE.md** — Change the plan file format documentation from:
   ```
   effort: medium
   ---
   ```
   To:
   ```
   ---
   effort: medium
   ---
   ```

4. **Update tests** in `tests/unit/frontmatter.test.ts`:
   - Add tests for the new standard format (opening + closing `---`)
   - Keep tests for legacy format (closing only) to verify backward compatibility
   - Test edge cases: extra whitespace before opening `---`, empty frontmatter block (`---\n---`)

5. **Update this project's planning prompt** — The system prompt at the top of this conversation also references the frontmatter format. This is injected by RAF, so updating the prompts in step 2 covers future projects.

## Acceptance Criteria
- [ ] Parser handles standard `---`/`---` format correctly
- [ ] Parser still handles legacy closing-only format (backward compatibility)
- [ ] Planning prompts generate the new standard format
- [ ] CLAUDE.md documentation updated
- [ ] Tests cover both old and new formats
- [ ] All existing tests pass

## Notes
- Backward compatibility is important since existing projects have plan files in the old format
- The parser should be robust: handle `---` with trailing spaces, `---` with trailing content on the same line, etc.
- Obsidian treats `---` at the very start of a file as YAML frontmatter — this is the standard we're adopting
