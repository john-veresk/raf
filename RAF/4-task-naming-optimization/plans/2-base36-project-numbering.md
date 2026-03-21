# Task: Implement Base36 Project Numbering

## Objective
Implement alphanumeric base36 numbering for project prefixes that kicks in after project 999, providing ~46,000 combinations in 3 characters.

## Context
Current project numbering uses 3-digit zero-padded numbers (001-999). The user wants a scalable solution that remains user-readable and short. Base36 encoding (0-9, a-z) allows for 36^3 = 46,656 combinations in 3 characters.

**Numbering scheme:**
- Projects 1-999: Use current format (001, 002, ..., 999)
- Projects 1000+: Use base36 format (a00, a01, ..., a0z, a10, ..., zzz)

## Requirements
- Keep backwards compatibility: existing projects (001-999) continue to work
- No migration needed: old projects stay as-is
- New projects after 999 use base36 (a00 = 1000, a01 = 1001, etc.)
- Support reading both formats when resolving project identifiers
- Base36 uses lowercase letters only (a-z, not A-Z)
- Maintain 3-character prefix for consistency

## Implementation Steps
1. Read `src/utils/paths.ts` - understand current `formatProjectNumber()` and `getNextProjectNumber()` functions
2. Create helper functions for base36 encoding/decoding:
   - `encodeBase36(num: number): string` - converts 1000+ to 'a00', 'a01', etc.
   - `decodeBase36(str: string): number` - converts 'a00' back to 1000
3. Update `formatProjectNumber(num)`:
   - If num <= 999: return zero-padded 3-digit string (current behavior)
   - If num >= 1000: return base36 encoded string
4. Update `extractProjectNumber(projectPath)`:
   - Support parsing both numeric (001-999) and base36 (a00-zzz) prefixes
5. Update `getNextProjectNumber(rafDir)`:
   - Scan for both numeric and base36 prefixed folders
   - Return correct next number in sequence
6. Update `resolveProjectIdentifier()` to handle both formats
7. Add comprehensive tests for edge cases:
   - Transition from 999 to a00 (1000)
   - Mixed folder formats
   - Base36 parsing and formatting
8. Update validation in `src/utils/validation.ts` if needed

## Acceptance Criteria
- [ ] Projects 1-999 use format: 001, 002, ..., 999
- [ ] Project 1000 uses format: a00
- [ ] Project 1001 uses format: a01
- [ ] `raf do 003` still works for existing projects
- [ ] `raf do a00` works for base36 projects
- [ ] `raf plan` correctly determines next project number across mixed formats
- [ ] All tests pass including new base36 tests

## Notes
- Base36 math: a00 = 10*36^2 + 0*36 + 0 = 12960 in pure base36, but we're using it to represent 1000+
- Simpler approach: treat a00 as 1000 offset (a00 = 1000, a01 = 1001, etc.)
  - 'a' represents 1000-1035 (a00-a0z, a10-a1z, a20-a2z)
  - Each letter block = 36*36 = 1296 numbers
- Consider edge cases: what if user manually creates folders with inconsistent numbering?
- Sorting should work: 001 < 002 < 999 < a00 < a01 (lexicographic with numbers before letters)
