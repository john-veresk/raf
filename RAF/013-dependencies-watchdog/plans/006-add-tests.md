# Task: Add Tests for Dependency Features

## Objective
Create comprehensive tests for all dependency-related functionality to ensure reliable behavior.

## Context
The dependency watchdog feature introduces several new behaviors that need test coverage: parsing, state derivation, blocking logic, and prompt generation.

## Dependencies
001, 002, 003, 004, 005

## Requirements
- Unit tests for dependency parsing
- Unit tests for blocked status derivation
- Unit tests for getNextExecutableTask with blocked tasks
- Integration tests for the full blocking flow
- Test edge cases: no dependencies, multiple dependencies, cascading blocks

## Implementation Steps
1. Add tests in `src/parsers/__tests__/` for dependency parsing:
   - Parse valid Dependencies section
   - Handle missing Dependencies section (returns empty array)
   - Handle malformed input gracefully
   - Parse multiple dependencies
2. Add tests in `src/core/__tests__/state-derivation.test.ts`:
   - Task blocked when single dependency fails
   - Task blocked when any of multiple dependencies fails
   - Cascading: task blocked when dependency is blocked
   - Task not blocked when all dependencies completed
   - BLOCKED marker recognition
3. Add tests for getNextExecutableTask:
   - Skip blocked tasks
   - Return null when all remaining tasks blocked
   - Handle mixed states (some completed, some pending, some blocked)
4. Add tests for execution prompt generation with dependencies:
   - Include dependency context when present
   - Omit section when no dependencies
5. Add integration test for full flow (if test infrastructure supports):
   - Mock project with dependencies
   - Simulate failure of one task
   - Verify dependent tasks get blocked

## Acceptance Criteria
- [ ] Dependency parsing tests pass
- [ ] Blocked status derivation tests pass
- [ ] getNextExecutableTask tests cover blocked scenarios
- [ ] Prompt generation tests verify dependency context
- [ ] All new code has >80% test coverage
- [ ] Tests follow existing patterns in the codebase

## Notes
- Follow TDD where possible - write tests for each component as it's implemented
- Use mocking for Claude calls to test execution flow without actual API calls
- Ensure tests run in isolation (don't depend on file system state)
