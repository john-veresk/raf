import * as fs from 'node:fs';
import * as path from 'node:path';
import { deriveProjectState, getDerivedStats, type DerivedTaskStatus } from './state-derivation.js';
import { extractDecisionItems, extractMarkdownSection, extractOutcomeSummary } from './outcome-summary.js';
import { getResolvedConfig } from '../utils/config.js';
import {
  extractTaskNameFromPlanFile,
  getContextPath,
  getInputPath,
  getOutcomesDir,
} from '../utils/paths.js';

interface TaskArtifact {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'blocked';
  taskName: string;
  planPath: string;
  planContent: string;
  outcomePath: string;
  outcomeContent: string | null;
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

function dedupeDecisionItems(items: string[], maxItems: number): string[] {
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

    if (unique.length >= maxItems) {
      break;
    }
  }

  return unique;
}

function renderBulletSection(items: string[], emptyMessage: string): string {
  if (items.length === 0) {
    return `- ${emptyMessage}`;
  }
  return items.map((item) => `- ${item}`).join('\n');
}

export function buildProjectContext(projectPath: string): string {
  const config = getResolvedConfig().context;
  const state = deriveProjectState(projectPath);
  const stats = getDerivedStats(state) ?? computeStats(state.tasks);
  const taskArtifacts = readTaskArtifacts(projectPath);

  const inputPath = getInputPath(projectPath);
  const inputContent = fs.existsSync(inputPath) ? fs.readFileSync(inputPath, 'utf-8') : null;
  const goal = firstMeaningfulInputBlock(inputContent, config.goalMaxChars);

  const decisionItems = dedupeDecisionItems(
    taskArtifacts.flatMap((task) => [
      ...extractDecisionItems(task.planContent),
      ...(task.outcomeContent ? extractDecisionItems(task.outcomeContent) : []),
    ]),
    config.maxDecisionItems,
  );

  const completedWork = taskArtifacts
    .filter((task) => task.status === 'completed' && task.outcomeContent)
    .slice(0, config.maxCompletedTasks)
    .map((task) => `Task ${task.id}: ${task.taskName} — ${extractOutcomeSummary(task.outcomeContent!, config.outcomeSummaryMaxChars)}`);

  const pendingWork = taskArtifacts
    .filter((task) => task.status !== 'completed')
    .slice(0, config.maxPendingTasks)
    .map((task) => {
      const objective = extractMarkdownSection(task.planContent, 'Objective');
      const suffix = objective ? ` — ${truncateAtBoundary(objective.replace(/\s+/g, ' '), config.outcomeSummaryMaxChars)}` : '';
      return `Task ${task.id}: ${task.taskName} [${task.status}]${suffix}`;
    });

  const recentOutcomeRefs = taskArtifacts
    .filter((task) => task.outcomeContent)
    .slice(-config.recentOutcomeLimit)
    .map((task) => `outcomes/${path.basename(task.outcomePath)}`);

  return [
    '# Project Context',
    '',
    '## Goal',
    goal,
    '',
    '## Key Decisions',
    renderBulletSection(decisionItems, 'No key decisions recorded yet.'),
    '',
    '## Current State',
    `- Status: ${state.status}`,
    `- Total tasks: ${stats.total}`,
    `- Completed: ${stats.completed}`,
    `- Pending: ${stats.pending}`,
    `- Failed: ${stats.failed}`,
    `- Blocked: ${stats.blocked}`,
    '',
    '## Completed Work',
    renderBulletSection(completedWork, 'No completed work yet.'),
    '',
    '## Pending Work',
    renderBulletSection(pendingWork, 'No pending work.'),
    '',
    '## Source Files',
    '- input.md',
    '- plans/',
    '- outcomes/',
    ...recentOutcomeRefs.map((ref) => `- ${ref}`),
    '',
  ].join('\n');
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
