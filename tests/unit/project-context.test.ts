import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DEFAULT_PROJECT_CONTEXT, readProjectContext } from '../../src/core/project-context.js';

describe('project context reader', () => {
  let tempDir: string;
  let projectPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-project-context-'));
    projectPath = path.join(tempDir, '1-context-project');
    fs.mkdirSync(path.join(projectPath, 'plans'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'outcomes'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('exports the read-only default placeholder context', () => {
    expect(DEFAULT_PROJECT_CONTEXT).toBe('# Project Context\n\nNo shared context available yet.\n');
  });

  it('returns null when context.md is missing', () => {
    expect(readProjectContext(projectPath)).toBeNull();
  });

  it('reads context.md verbatim when present', () => {
    const content = `# Project Context

## Goal
Track the durable project summary in a hand-maintained file.

## Key Decisions
- Keep this file focused on durable project context.

## Project Files
- \`input.md\` — Inspect if you need the original request.
`;
    fs.writeFileSync(path.join(projectPath, 'context.md'), content);

    expect(readProjectContext(projectPath)).toBe(content);
  });

  it('does not regenerate context from input, plans, or outcomes', () => {
    fs.writeFileSync(path.join(projectPath, 'input.md'), '# Request\n\nBuild shared context automatically.\n');
    fs.writeFileSync(
      path.join(projectPath, 'plans', '1-task.md'),
      `# Task: One

## Objective
Generate context automatically.
`,
    );
    fs.writeFileSync(
      path.join(projectPath, 'outcomes', '1-task.md'),
      `# Outcome

## Summary

Generated context automatically.

<promise>COMPLETE</promise>
`,
    );

    expect(readProjectContext(projectPath)).toBeNull();
  });
});
