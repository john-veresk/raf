# Task: Creative Project Naming

## Objective
Change the project naming model from Haiku to Sonnet and update the prompt to generate short, punchy, creative, and memorable names using metaphors.

## Context
Currently, `src/utils/name-generator.ts` uses Haiku to generate descriptive, action-oriented names like `add-user-auth` or `fix-payment-flow`. The user wants more creative, memorable names that use metaphors to capture the spirit of the task rather than literally describing it.

## Requirements
- Change model from `haiku` to `sonnet`
- Update prompt to ask for creative, punchy, memorable names
- Names should use metaphors/analogies that capture the spirit of the task
- Mix of styles allowed: codenames, abstract, playful, evocative
- Keep names short (1-3 words, kebab-case)
- Names should be fun and memorable, not boring descriptors

## Implementation Steps

1. Open `src/utils/name-generator.ts`

2. Change the model constant (line 5):
   ```typescript
   const SONNET_MODEL = 'sonnet';
   ```

3. Replace the `NAME_GENERATION_PROMPT` (lines 7-14) with a creative prompt:
   ```typescript
   const NAME_GENERATION_PROMPT = `Generate a short, punchy, creative project name (1-3 words, kebab-case).

   Be creative! Use metaphors, analogies, or evocative words that capture the SPIRIT of the project.
   Don't literally describe what it does - make it memorable and fun.

   Good examples:
   - Bug fix → 'bug-squasher', 'exterminator', 'patch-adams'
   - Performance optimization → 'turbo-boost', 'lightning-rod', 'speed-demon'
   - Auth system → 'gatekeeper', 'bouncer', 'key-master'
   - Refactoring → 'spring-cleaning', 'phoenix', 'makeover'
   - New feature → 'moonshot', 'secret-sauce', 'magic-wand'

   Output ONLY the kebab-case name. No quotes, no explanation.

   Project description:`;
   ```

4. Update the function name reference from `callHaikuForName` to `callSonnetForName` (or keep generic like `callModelForName`)

5. Update the model flag in `execSync` call (line 47):
   ```typescript
   `claude --model ${SONNET_MODEL} --print "${escapeShellArg(fullPrompt)}"`
   ```

6. Update debug log messages to reference Sonnet instead of Haiku

7. Run tests to verify: `npm test`

## Acceptance Criteria
- [ ] Model changed from Haiku to Sonnet
- [ ] Prompt updated to request creative, metaphorical names
- [ ] Generated names are short (1-3 words)
- [ ] Names are creative and memorable (not literal descriptions)
- [ ] Fallback behavior still works if Sonnet call fails
- [ ] All existing tests pass

## Notes
- Sonnet is more creative than Haiku, which is why it's better suited for this task
- The prompt examples help guide the model toward the desired style
- Keep the sanitization logic unchanged - it handles edge cases well
- The fallback to extracting words from description remains as safety net
