import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildProjectContext, refreshProjectContext } from '../../src/core/project-context.js';

describe('project context builder', () => {
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

  it('builds deterministic context from input, plans, derived state, and outcomes', () => {
    fs.writeFileSync(
      path.join(projectPath, 'input.md'),
      '# Request\n\nShip the always-on context flow without duplicating project guidance.\n\nExtra notes here.',
    );
    fs.writeFileSync(
      path.join(projectPath, 'plans', '1-first-task.md'),
      `# Task: First task

## Objective
Implement the shared context builder.

## Key Decisions
- Use context.md as the shared artifact.
- Reuse the outcome summarizer.

## Acceptance Criteria
- [ ] Works
`,
    );
    fs.writeFileSync(
      path.join(projectPath, 'plans', '2-second-task.md'),
      `# Task: Second task

## Objective
Wire execution prompts to use context.md.

## Acceptance Criteria
- [ ] Works
`,
    );
    fs.writeFileSync(
      path.join(projectPath, 'outcomes', '1-first-task.md'),
      `# Outcome

## Summary

Implemented the builder and shared summary extraction.

## Decision Updates

- Use context.md as the shared artifact.
- Refresh context after each saved outcome.

<promise>COMPLETE</promise>
`,
    );

    const context = buildProjectContext(projectPath);

    expect(context).toContain('# Project Context');
    expect(context).toContain('## Goal');
    expect(context).toContain('Ship the always-on context flow');
    expect(context).toContain('## Key Decisions');
    expect(context).toContain('- Use context.md as the shared artifact.');
    expect(context).toContain('- Reuse the outcome summarizer.');
    expect(context).toContain('- Refresh context after each saved outcome.');
    expect(context).toContain('## Current State');
    expect(context).toContain('- Status: executing');
    expect(context).toContain('## Completed Work');
    expect(context).toContain('Task 1: first-task — Implemented the builder and shared summary extraction.');
    expect(context).toContain('## Pending Work');
    expect(context).toContain('Task 2: second-task [pending]');
    expect(context).toContain('## Source Files');
    expect(context.match(/- input\.md/g)).toHaveLength(1);
    expect(context.match(/- plans\//g)).toHaveLength(1);
    expect(context.split('\n').filter((line) => line.trim() === '- outcomes/')).toHaveLength(1);
    expect(context).toContain('- outcomes/1-first-task.md');
  });

  it('prefers outcome summary sections and writes context.md to disk', () => {
    fs.writeFileSync(path.join(projectPath, 'input.md'), 'Keep summaries concise.');
    fs.writeFileSync(
      path.join(projectPath, 'plans', '1-task.md'),
      `# Task: One

## Objective
Do the thing.

## Acceptance Criteria
- [ ] Done
`,
    );
    fs.writeFileSync(
      path.join(projectPath, 'outcomes', '1-task.md'),
      `Intro text that should not be used.

## Summary

Preferred summary text.

## Details

${'x'.repeat(1000)}

<promise>COMPLETE</promise>
`,
    );

    const written = refreshProjectContext(projectPath);
    const fileContent = fs.readFileSync(path.join(projectPath, 'context.md'), 'utf-8');

    expect(fileContent).toBe(written);
    expect(fileContent).toContain('Task 1: task — Preferred summary text.');
    expect(fileContent).not.toContain('Intro text that should not be used.');
  });
});
