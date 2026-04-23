#!/usr/bin/env node
// Generates prompts-data.js by invoking the real RAF prompt functions
// from ../dist/prompts/*.js with representative sample inputs.
//
// Run:  node prompt-viewer/generate.mjs
// Requires the project to have been built first (`npm run build`).

import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const distPrompts = path.join(repoRoot, 'dist', 'prompts');

if (!existsSync(path.join(distPrompts, 'planning.js'))) {
  console.error('dist/prompts not found — run `npm run build` first.');
  process.exit(1);
}

const planningMod = await import(path.join(distPrompts, 'planning.js'));
const executionMod = await import(path.join(distPrompts, 'execution.js'));
const amendMod = await import(path.join(distPrompts, 'amend.js'));

const getPlanningPrompt = planningMod.getPlanningPrompt;
const getExecutionPrompt = executionMod.getExecutionPrompt;
const getAmendPrompt = amendMod.getAmendPrompt;

const SAMPLE_PROJECT = '/Users/ada/work/RAF/7-quiet-compass';
const SAMPLE_INPUT = `We need a lightweight web viewer for the generated RAF prompts.
The goal is letting a reviewer flip between planning / execution / amend prompts,
toggle retry and dependency branches, and read them with section-level highlighting.

Constraints:
- No build step. Pure HTML+CSS+JS, opens from file://.
- Pulls real prompt text from dist/prompts so it never drifts.
- Feels like a piece of editorial software, not a dashboard template.`;

const SAMPLE_CONTEXT = `# Project Context

## Goal
Ship a zero-build web viewer that renders the exact strings RAF feeds to Claude,
so humans can audit prompt wording without reading TypeScript template literals.

## Current State
- Prompt generators live in src/prompts/{planning,execution,amend}.ts
- CLI pipes their output straight to the harness; nothing else renders them
- Operators currently eyeball them in terminal transcripts

## Key Decisions
- Viewer is read-only; no server, no edit mode
- Section colour coding is driven by regex markers, not prompt metadata

## Project Files
- input.md — Inspect if you need the user's seed request for the viewer scope.
- prompt-viewer/generate.mjs — Inspect if prompt wording changed and you need to update the frozen sample context or regenerate prompt-viewer data.
- prompt-viewer/prompts-data.js — Inspect if you need to verify or refresh the checked-in prompt snapshot after regenerating it.
`;

const SAMPLE_EXISTING_TASKS = [
  {
    id: '1',
    taskName: 'scaffold-viewer-shell',
    planFile: 'plans/1-scaffold-viewer-shell.md',
    status: 'completed',
    dependencies: [],
  },
  {
    id: '2',
    taskName: 'wire-real-prompt-generator',
    planFile: 'plans/2-wire-real-prompt-generator.md',
    status: 'completed',
    dependencies: ['1'],
  },
  {
    id: '3',
    taskName: 'section-colour-coding',
    planFile: 'plans/3-section-colour-coding.md',
    status: 'pending',
    dependencies: ['2'],
  },
  {
    id: '4',
    taskName: 'retry-variant-toggle',
    planFile: 'plans/4-retry-variant-toggle.md',
    status: 'failed',
    dependencies: ['2'],
  },
];

function variantPlanning(harness) {
  const { systemPrompt, userMessage } = getPlanningPrompt({
    projectPath: SAMPLE_PROJECT,
    inputContent: SAMPLE_INPUT,
    harness,
  });
  return { systemPrompt, userMessage };
}

function variantExecution(options) {
  const {
    autoCommit = true,
    attemptNumber = 1,
    withDependencies = false,
  } = options;

  const dependencyOutcomes = withDependencies
    ? [
        {
          taskId: '1',
          content: `# Outcome: scaffold-viewer-shell

Created prompt-viewer/ with index.html, style.css, app.js.
Static assets only, no build step.

## Decision Updates
- Chose plain HTML over React: zero dependencies, opens from file://.

<promise>COMPLETE</promise>`,
        },
        {
          taskId: '2',
          content: `# Outcome: wire-real-prompt-generator

Added generate.mjs. Imports dist/prompts/*.js and writes prompts-data.js
as a window.RAF_PROMPTS assignment so index.html can load it via <script>.

## Decision Updates
- Froze sample inputs inline instead of reading from disk — keeps the
  viewer self-contained and lets us check the data file into git if desired.

<promise>COMPLETE</promise>`,
        },
      ]
    : [];

  const prompt = getExecutionPrompt({
    projectPath: SAMPLE_PROJECT,
    planPath: `${SAMPLE_PROJECT}/plans/3-section-colour-coding.md`,
    taskId: '3',
    taskNumber: 3,
    totalTasks: 4,
    autoCommit,
    projectNumber: '7',
    outcomeFilePath: `${SAMPLE_PROJECT}/outcomes/3-section-colour-coding.md`,
    contextContent: SAMPLE_CONTEXT,
    attemptNumber,
    previousOutcomeFile:
      attemptNumber > 1
        ? `${SAMPLE_PROJECT}/outcomes/3-section-colour-coding.md`
        : undefined,
    dependencyIds: withDependencies ? ['1', '2'] : [],
    dependencyOutcomes,
  });
  return { userMessage: prompt };
}

function variantAmend(harness) {
  const { systemPrompt, userMessage } = getAmendPrompt({
    projectPath: SAMPLE_PROJECT,
    contextContent: SAMPLE_CONTEXT,
    existingTasks: SAMPLE_EXISTING_TASKS,
    nextTaskNumber: 5,
    newTaskDescription:
      'Add an export button that copies the currently-rendered prompt as plain text to the clipboard, and a second button that downloads it as a .md file.',
    harness,
  });
  return { systemPrompt, userMessage };
}

const data = {
  generatedAt: new Date().toISOString(),
  sample: {
    projectPath: SAMPLE_PROJECT,
    input: SAMPLE_INPUT,
    context: SAMPLE_CONTEXT,
    existingTasks: SAMPLE_EXISTING_TASKS,
  },
  modes: {
    planning: {
      label: 'Planning',
      description:
        'First-pass prompt sent when the user types `raf plan`. Establishes conventions, plan template, interview instructions.',
      variants: {
        'claude-harness': {
          label: 'Claude harness',
          ...variantPlanning('claude'),
        },
        'codex-harness': {
          label: 'Codex harness',
          ...variantPlanning('codex'),
        },
      },
    },
    execution: {
      label: 'Execution',
      description:
        'Per-task prompt sent when `raf do` runs a pending task. Splices in plan path, outcome file, dependency outcomes, retry context.',
      variants: {
        'first-attempt': {
          label: 'First attempt · auto-commit',
          ...variantExecution({ autoCommit: true, attemptNumber: 1 }),
        },
        'no-auto-commit': {
          label: 'First attempt · no auto-commit',
          ...variantExecution({ autoCommit: false, attemptNumber: 1 }),
        },
        retry: {
          label: 'Retry (attempt 2)',
          ...variantExecution({ autoCommit: true, attemptNumber: 2 }),
        },
        'with-deps': {
          label: 'With dependencies',
          ...variantExecution({
            autoCommit: true,
            attemptNumber: 1,
            withDependencies: true,
          }),
        },
      },
    },
    amend: {
      label: 'Amend',
      description:
        'Prompt sent when the user adds tasks to an existing project. Lists protected vs modifiable tasks, reuses planning principles.',
      variants: {
        'claude-harness': {
          label: 'Claude harness',
          ...variantAmend('claude'),
        },
        'codex-harness': {
          label: 'Codex harness',
          ...variantAmend('codex'),
        },
      },
    },
  },
};

const out = path.join(__dirname, 'prompts-data.js');
const body = `// Auto-generated by generate.mjs — do not edit by hand.
// Run: node prompt-viewer/generate.mjs
window.RAF_PROMPTS = ${JSON.stringify(data, null, 2)};
`;
writeFileSync(out, body, 'utf8');
console.log(`wrote ${path.relative(repoRoot, out)}`);
