import * as fs from 'node:fs';
import * as path from 'node:path';
import { deriveProjectState, getDerivedStats, type DerivedTaskStatus } from './state-derivation.js';
import { extractDecisionItems, extractMarkdownSection, extractOutcomeSummaryDetails } from './outcome-summary.js';
import {
  extractTaskNameFromPlanFile,
  getContextPath,
  getInputPath,
  getOutcomesDir,
} from '../utils/paths.js';

const PROJECT_CONTEXT_POLICY = {
  maxRenderedChars: 12_000,
  minReservedSectionChars: 120,
  goalMaxChars: 900,
  itemMaxChars: 280,
} as const;

interface TaskArtifact {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'blocked';
  taskName: string;
  planPath: string;
  planContent: string;
  outcomePath: string;
  outcomeContent: string | null;
}

interface TruncationResult {
  text: string;
  truncated: boolean;
}

interface BulletSectionOptions {
  title: string;
  items: string[];
  emptyMessage: string;
  omissionLabel: string;
}

function truncateAtBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  const truncated = text.slice(0, maxChars - 3);
  const lastBreak = Math.max(truncated.lastIndexOf('. '), truncated.lastIndexOf('\n'));
  if (lastBreak > Math.floor(maxChars / 2)) {
    return `${truncated.slice(0, lastBreak + 1).trimEnd()}...`;
  }
  return `${truncated.trimEnd()}...`;
}

function firstMeaningfulInputBlock(input: string | null, maxChars: number): string {
  if (!input) {
    return 'No goal recorded yet.';
  }

  const cleaned = input
    .replace(/<!--[\s\S]*?-->/g, '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find((block) => block && !/^#/.test(block));

  if (!cleaned) {
    return 'No goal recorded yet.';
  }

  return truncateAtBoundary(cleaned.replace(/\s+/g, ' '), maxChars);
}

function truncateInlineText(text: string, maxChars: number): TruncationResult {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const truncated = truncateAtBoundary(normalized, maxChars);

  return {
    text: truncated,
    truncated: truncated !== normalized,
  };
}

function appendSafetyNotice(text: string, truncated: boolean, label: string): string {
  return truncated ? `${text} [${label}]` : text;
}

function readStoredGoal(projectPath: string): string | null {
  const contextPath = getContextPath(projectPath);
  if (!fs.existsSync(contextPath)) {
    return null;
  }

  const existingContext = fs.readFileSync(contextPath, 'utf-8');
  const storedGoal = extractMarkdownSection(existingContext, 'Goal')?.trim();
  if (!storedGoal) {
    return null;
  }

  return storedGoal;
}

function resolveGoal(projectPath: string, maxChars: number): string {
  const storedGoal = readStoredGoal(projectPath);
  if (storedGoal) {
    return truncateAtBoundary(storedGoal, maxChars);
  }

  const inputPath = getInputPath(projectPath);
  const inputContent = fs.existsSync(inputPath) ? fs.readFileSync(inputPath, 'utf-8') : null;
  return firstMeaningfulInputBlock(inputContent, maxChars);
}

function readTaskArtifacts(projectPath: string): TaskArtifact[] {
  const state = deriveProjectState(projectPath);
  const outcomesDir = getOutcomesDir(projectPath);

  return state.tasks.map((task) => {
    const planFilename = task.planFile.replace(/^plans\//, '');
    const planPath = path.join(projectPath, task.planFile);
    const outcomePath = path.join(outcomesDir, planFilename);
    const outcomeContent = fs.existsSync(outcomePath) ? fs.readFileSync(outcomePath, 'utf-8') : null;

    return {
      id: task.id,
      status: task.status,
      taskName: extractTaskNameFromPlanFile(planFilename) ?? task.id,
      planPath,
      planContent: fs.existsSync(planPath) ? fs.readFileSync(planPath, 'utf-8') : '',
      outcomePath,
      outcomeContent,
    };
  });
}

function computeStats(tasks: Array<{ status: DerivedTaskStatus }>): ReturnType<typeof getDerivedStats> {
  return tasks.reduce(
    (acc, task) => {
      acc.total++;
      acc[task.status]++;
      return acc;
    },
    {
      pending: 0,
      completed: 0,
      failed: 0,
      blocked: 0,
      total: 0,
    },
  );
}

function dedupeDecisionItems(items: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const item of items) {
    const normalized = item
      .toLowerCase()
      .replace(/[`*_]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s:/.-]/g, '')
      .trim();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    unique.push(item);
  }

  return unique;
}

function renderBulletSection(title: string, items: string[], emptyMessage: string, omissionMessage?: string): string {
  const lines = [title];

  if (items.length === 0) {
    lines.push(`- ${omissionMessage ?? emptyMessage}`);
  } else {
    lines.push(...items.map((item) => `- ${item}`));
    if (omissionMessage) {
      lines.push(`- ${omissionMessage}`);
    }
  }

  return lines.join('\n');
}

function renderSection(title: string, body: string): string {
  return `${title}\n${body}`;
}

function formatOmissionMessage(label: string, count: number): string {
  if (count <= 0) {
    return '';
  }

  return `Additional ${label} omitted for context safety (${count} more).`;
}

function renderBudgetedBulletSection(
  sections: string[],
  options: BulletSectionOptions,
  reserveChars: number,
): string | null {
  const items = options.items.filter(Boolean);

  if (items.length === 0) {
    return renderBulletSection(options.title, [], options.emptyMessage);
  }

  for (let included = items.length; included >= 0; included--) {
    const visibleItems = items.slice(0, included);
    const omittedCount = items.length - included;
    const omissionMessage = omittedCount > 0 ? formatOmissionMessage(options.omissionLabel, omittedCount) : undefined;
    const candidate = renderBulletSection(options.title, visibleItems, options.emptyMessage, omissionMessage);

    if (fitsWithinBudget(sections, candidate, reserveChars)) {
      return candidate;
    }
  }

  const fallback = renderBulletSection(
    options.title,
    [],
    options.emptyMessage,
    formatOmissionMessage(options.omissionLabel, items.length),
  );

  return fitsWithinBudget(sections, fallback) ? fallback : null;
}

function renderSourceFilesSection(sections: string[], outcomeRefs: string[], reserveChars: number): string | null {
  const baseItems = ['input.md', 'plans/', 'outcomes/'];
  const recentOutcomeRefs = [...outcomeRefs].reverse();

  for (let included = recentOutcomeRefs.length; included >= 0; included--) {
    const visibleRefs = recentOutcomeRefs.slice(0, included);
    const omittedCount = recentOutcomeRefs.length - included;
    const omissionMessage = omittedCount > 0 ? formatOmissionMessage('outcome references', omittedCount) : undefined;
    const candidate = renderBulletSection(
      '## Source Files',
      [...baseItems, ...visibleRefs],
      'No source files recorded.',
      omissionMessage,
    );

    if (fitsWithinBudget(sections, candidate, reserveChars)) {
      return candidate;
    }
  }

  const fallback = renderBulletSection('## Source Files', baseItems, 'No source files recorded.');
  return fitsWithinBudget(sections, fallback) ? fallback : null;
}

function fitsWithinBudget(sections: string[], candidate: string, reserveChars: number = 0): boolean {
  return renderContextDocument([...sections, candidate]).length <= PROJECT_CONTEXT_POLICY.maxRenderedChars - reserveChars;
}

function renderContextDocument(sections: string[]): string {
  return `${sections.join('\n\n')}\n`;
}

export function buildProjectContext(projectPath: string): string {
  const state = deriveProjectState(projectPath);
  const stats = getDerivedStats(state) ?? computeStats(state.tasks);
  const taskArtifacts = readTaskArtifacts(projectPath);

  const goal = resolveGoal(projectPath, PROJECT_CONTEXT_POLICY.goalMaxChars);

  const decisionItems = dedupeDecisionItems(
    taskArtifacts.flatMap((task) => [
      ...extractDecisionItems(task.planContent),
      ...(task.outcomeContent ? extractDecisionItems(task.outcomeContent) : []),
    ]),
  ).map((item) => truncateInlineText(item, PROJECT_CONTEXT_POLICY.itemMaxChars).text);

  const completedWork = taskArtifacts
    .filter((task) => task.status === 'completed' && task.outcomeContent)
    .slice()
    .reverse()
    .map((task) => {
      const summary = extractOutcomeSummaryDetails(task.outcomeContent!, PROJECT_CONTEXT_POLICY.itemMaxChars);
      return `Task ${task.id}: ${task.taskName} — ${appendSafetyNotice(summary.summary, summary.truncated, 'summary shortened for context safety')}`;
    });

  const pendingWork = taskArtifacts
    .filter((task) => task.status !== 'completed')
    .map((task) => {
      const objective = extractMarkdownSection(task.planContent, 'Objective');
      const truncatedObjective = objective
        ? truncateInlineText(objective, PROJECT_CONTEXT_POLICY.itemMaxChars)
        : null;
      const suffix = truncatedObjective
        ? ` — ${appendSafetyNotice(truncatedObjective.text, truncatedObjective.truncated, 'objective shortened for context safety')}`
        : '';
      return `Task ${task.id}: ${task.taskName} [${task.status}]${suffix}`;
    });

  const recentOutcomeRefs = taskArtifacts
    .filter((task) => task.outcomeContent)
    .map((task) => `outcomes/${path.basename(task.outcomePath)}`);

  const sections = [
    '# Project Context',
    renderSection('## Goal', goal),
  ];

  const optionalSections = [
    {
      build: (renderedSections: string[], reserveChars: number) =>
        renderBudgetedBulletSection(renderedSections, {
          title: '## Key Decisions',
          items: decisionItems,
          emptyMessage: 'No key decisions recorded yet.',
          omissionLabel: 'key decisions',
        }, reserveChars),
    },
    {
      build: () => renderSection(
        '## Current State',
        [
          `- Status: ${state.status}`,
          `- Total tasks: ${stats.total}`,
          `- Completed: ${stats.completed}`,
          `- Pending: ${stats.pending}`,
          `- Failed: ${stats.failed}`,
          `- Blocked: ${stats.blocked}`,
        ].join('\n'),
      ),
    },
    {
      build: (renderedSections: string[], reserveChars: number) =>
        renderBudgetedBulletSection(renderedSections, {
          title: '## Pending Work',
          items: pendingWork,
          emptyMessage: 'No pending work.',
          omissionLabel: 'pending tasks',
        }, reserveChars),
    },
    {
      build: (renderedSections: string[], reserveChars: number) =>
        renderBudgetedBulletSection(renderedSections, {
          title: '## Completed Work',
          items: completedWork,
          emptyMessage: 'No completed work yet.',
          omissionLabel: 'completed tasks',
        }, reserveChars),
    },
    {
      build: (renderedSections: string[], reserveChars: number) =>
        renderSourceFilesSection(renderedSections, recentOutcomeRefs, reserveChars),
    },
  ];

  for (let index = 0; index < optionalSections.length; index++) {
    const reserveChars = (optionalSections.length - index - 1) * PROJECT_CONTEXT_POLICY.minReservedSectionChars;
    const section = optionalSections[index]?.build(sections, reserveChars);
    if (section) {
      sections.push(section);
    }
  }

  return renderContextDocument(sections);
}

export function refreshProjectContext(projectPath: string): string {
  const content = buildProjectContext(projectPath);
  fs.writeFileSync(getContextPath(projectPath), content);
  return content;
}

export function readProjectContext(projectPath: string): string {
  const contextPath = getContextPath(projectPath);
  if (!fs.existsSync(contextPath)) {
    return refreshProjectContext(projectPath);
  }
  return fs.readFileSync(contextPath, 'utf-8');
}
