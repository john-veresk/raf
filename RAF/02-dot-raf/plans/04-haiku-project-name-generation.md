# Task: Auto-Generate Project Names with Haiku

## Objective
Implement automatic project name generation using Claude Haiku model during the `raf plan` command.

## Context
Currently project names may be manually specified or use generic defaults. Using Claude Haiku to generate descriptive slug-style names based on the project description will provide meaningful, consistent naming automatically.

## Requirements
- Generate project name during `raf plan` command execution
- Use Claude CLI with Haiku model (`--model claude-3-haiku-20240307` or similar)
- Generate descriptive slug-style names (e.g., "user-auth-system", "api-rate-limiter")
- Auto-accept generated name (no user confirmation prompt)
- Name should be based on the project description provided by user

## Implementation Steps
1. Research Claude CLI documentation for model selection flags
   - Check `claude --help` for available options
   - Verify Haiku model identifier
2. Create a utility function to call Claude CLI with Haiku:
   ```typescript
   async function generateProjectName(description: string): Promise<string>
   ```
3. Craft a prompt for Haiku that:
   - Takes the project description as input
   - Returns a kebab-case slug (lowercase, hyphens, no special chars)
   - Keeps names concise (2-4 words typically)
4. Integrate into `raf plan` command flow:
   - After user provides project description
   - Before creating project folder
5. Use generated name for project folder: `RAF/001-generated-name/`
6. Handle edge cases:
   - Sanitize output (ensure valid folder name)
   - Fallback if Haiku call fails
   - Truncate if name is too long

## Acceptance Criteria
- [ ] `raf plan` generates project name using Haiku
- [ ] Names are descriptive slugs based on project description
- [ ] Names are valid folder names (kebab-case, no special chars)
- [ ] Name is auto-accepted without user prompt
- [ ] Graceful fallback if Haiku call fails
- [ ] All tests pass

## Notes
- Claude CLI command might look like: `claude --model claude-3-haiku-20240307 --print "Generate a short kebab-case project name for: {description}"`
- Consider caching or rate limiting if many projects are created
- The prompt to Haiku should be carefully crafted to get consistent slug format
- Example prompt: "Generate a 2-4 word kebab-case project name (like 'user-auth-flow' or 'api-caching-layer') for this project: {description}. Output ONLY the name, nothing else."
