# Task: Update README for npm Publishing

## Objective
Enhance the README.md with essential documentation so users know how to install and use RAF.

## Context
The README needs to be updated to be fully documented for npm publishing. The current README has basic sections but needs badges, better examples, and a GitHub repository link. The goal is that a person reading the README knows how to use the software.

GitHub repository: https://github.com/john-veresk/raf

## Requirements
- Add npm and license badges at the top
- Add GitHub repository link
- Ensure installation instructions are accurate
- Provide clearer usage examples for all three commands (plan, do, status)
- Make sure the documentation matches the current codebase functionality
- Keep it minimal - essential sections only

## Implementation Steps
1. Read the current README.md to understand existing structure
2. Add badges at the top:
   - npm version badge
   - License badge (MIT)
   - Node.js version badge
3. Review the current commands in `src/commands/` to ensure documentation accuracy
4. Update usage examples to be more descriptive and practical
5. Add GitHub repository link to appropriate sections
6. Update package.json with repository field: `"repository": { "type": "git", "url": "https://github.com/john-veresk/raf.git" }`
7. Verify all documented features match current implementation

## Acceptance Criteria
- [ ] README has npm, license, and Node.js badges at the top
- [ ] GitHub repository link is present
- [ ] Installation instructions are accurate for npm install
- [ ] Usage examples for plan, do, and status commands are clear and accurate
- [ ] All documented features match current codebase
- [ ] package.json has repository field populated
- [ ] Build succeeds

## Notes
- Reference `src/commands/*.ts` for accurate command documentation
- Check `package.json` for current version and other metadata
- Keep the README concise - this is essential documentation only
- The user specifically requested NOT to add a publishing section
