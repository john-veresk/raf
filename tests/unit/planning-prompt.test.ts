import { getPlanningPrompt, PlanningPromptParams } from '../../src/prompts/planning.js';

describe('Planning Prompt', () => {
  const defaultParams: PlanningPromptParams = {
    projectPath: '/test/project',
    inputContent: 'Build a todo app with user authentication',
    harness: 'claude',
  };

  describe('getPlanningPrompt', () => {
    it('should return systemPrompt and userMessage', () => {
      const result = getPlanningPrompt(defaultParams);

      expect(result).toHaveProperty('systemPrompt');
      expect(result).toHaveProperty('userMessage');
      expect(typeof result.systemPrompt).toBe('string');
      expect(typeof result.userMessage).toBe('string');
      expect(result.systemPrompt.length).toBeGreaterThan(0);
      expect(result.userMessage.length).toBeGreaterThan(0);
    });

    it('should interpolate projectPath into context.md, plans/, and project folder', () => {
      const params: PlanningPromptParams = {
        projectPath: '/my/custom/project/path',
        inputContent: 'Some description',
      };

      const { systemPrompt } = getPlanningPrompt(params);

      expect(systemPrompt).toContain('/my/custom/project/path');
      expect(systemPrompt).toContain('/my/custom/project/path/context.md');
      expect(systemPrompt).toContain('/my/custom/project/path/plans/');
    });

    it('should include project description in user message and prompt the interview', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Build a REST API with Express and MongoDB',
      };

      const { userMessage } = getPlanningPrompt(params);

      expect(userMessage).toContain('Build a REST API with Express and MongoDB');
      expect(userMessage).toContain('planning interview');
    });

    it('should include example task filename', () => {
      const { systemPrompt } = getPlanningPrompt(defaultParams);

      expect(systemPrompt).toContain('1-task-name.md');
    });
  });

  describe('seven retro principles', () => {
    const principles = [
      'Verify premise',
      'Trace lifecycle',
      'Prefer existing knobs',
      'Lean-first draft',
      'Architecture before tactics',
      "Plans aren't essays",
      "Reconcile, don't ratify",
    ];

    it.each(principles)('should contain principle: %s', (principle) => {
      const { systemPrompt } = getPlanningPrompt(defaultParams);
      expect(systemPrompt).toContain(principle);
    });
  });

  describe('condensed flow', () => {
    it('should express draft → self-critique → revise → write as one sentence', () => {
      const { systemPrompt } = getPlanningPrompt(defaultParams);

      // The flow must appear as a single sentence, not a numbered block
      expect(systemPrompt).toContain('draft');
      expect(systemPrompt).toContain('self-critique');
      expect(systemPrompt).toContain('revise');
      expect(systemPrompt).toContain('write the file');
    });
  });

  describe('minimum-viable plan template', () => {
    it('should include required sections', () => {
      const { systemPrompt } = getPlanningPrompt(defaultParams);

      expect(systemPrompt).toContain('## Objective');
      expect(systemPrompt).toContain('## Requirements');
      expect(systemPrompt).toContain('## Acceptance Criteria');
    });

    it('should include effort frontmatter', () => {
      const { systemPrompt } = getPlanningPrompt(defaultParams);

      expect(systemPrompt).toContain('effort:');
      expect(systemPrompt).toMatch(/effort.*REQUIRED/);
    });
  });

  describe('exploration and interview directives', () => {
    it('should use AskUserQuestion for Claude and not request_user_input', () => {
      const { systemPrompt } = getPlanningPrompt({
        ...defaultParams,
        harness: 'claude',
      });

      expect(systemPrompt).toContain('AskUserQuestion');
      expect(systemPrompt).not.toContain('request_user_input');
    });

    it('should use request_user_input for Codex and not AskUserQuestion', () => {
      const { systemPrompt } = getPlanningPrompt({
        ...defaultParams,
        harness: 'codex',
      });

      expect(systemPrompt).toContain('request_user_input');
      expect(systemPrompt).not.toContain('AskUserQuestion');
      expect(systemPrompt).toMatch(/short architectural\/foundational questions first/i);
      expect(systemPrompt).toContain('2-3 mutually exclusive choices');
      expect(systemPrompt).toContain('/test/project/context.md');
    });

    it('should call out lifecycle tracing in exploration', () => {
      const { systemPrompt } = getPlanningPrompt(defaultParams);

      expect(systemPrompt).toMatch(/creation.*storage.*consumption/);
    });

    it('should direct architectural questions before tactical ones', () => {
      const { systemPrompt } = getPlanningPrompt(defaultParams);

      expect(systemPrompt).toMatch(/architectural.*first/i);
      expect(systemPrompt).toMatch(/tactical.*after/i);
    });

    it('should require reconciling contradictions before planning', () => {
      const { systemPrompt } = getPlanningPrompt(defaultParams);

      expect(systemPrompt).toContain('reconcile');
      expect(systemPrompt).toContain('before proceeding');
    });

    it('should instruct the planner to maintain context.md goal as a clarified summary', () => {
      const { systemPrompt } = getPlanningPrompt(defaultParams);

      expect(systemPrompt).toContain('/test/project/context.md');
      expect(systemPrompt).toContain('## Goal');
      expect(systemPrompt).toMatch(/clarified summary/i);
      expect(systemPrompt).toMatch(/Do not copy raw prompt text verbatim from `input\.md`/);
    });

    it('should define context.md as project context rather than task context', () => {
      const { systemPrompt } = getPlanningPrompt(defaultParams);

      expect(systemPrompt).toMatch(/shared project context, not a task-scoped brief/i);
      expect(systemPrompt).toMatch(/whole project, not just this planning request/i);
      expect(systemPrompt).toMatch(/durable project state/i);
      expect(systemPrompt).toMatch(/Do not use a `## Current State` section in `context\.md`/i);
    });

    it('should reserve key decisions for durable domain choices instead of planning tactics', () => {
      const { systemPrompt } = getPlanningPrompt(defaultParams);

      expect(systemPrompt).toMatch(/durable project, product, code, API, or architecture decisions/i);
      expect(systemPrompt).toMatch(/exclude planning tactics, task sequencing, commit choreography/i);
      expect(systemPrompt).toMatch(/Do not put planning tactics, task sequencing, commit choreography/i);
    });

    it('should steer context project files toward concrete file paths with inspection guidance', () => {
      const { systemPrompt } = getPlanningPrompt(defaultParams);

      expect(systemPrompt).toMatch(/## Project Files/);
      expect(systemPrompt).toContain('input.md');
      expect(systemPrompt).toContain('context.md');
      expect(systemPrompt).toContain('plans/3-task-name.md');
      expect(systemPrompt).toContain('outcomes/3-task-name.md');
      expect(systemPrompt).toMatch(/inspect that file if it becomes relevant/i);
      expect(systemPrompt).toMatch(/Do not list bare directories or globs/i);
      expect(systemPrompt).toMatch(/do not list implementation source files/i);
    });
  });

  describe('planning completion contract', () => {
    it('should require committing and verifying planning artifacts before declaring success', () => {
      const { systemPrompt } = getPlanningPrompt(defaultParams);

      expect(systemPrompt).toContain('Stage the planning artifacts you changed');
      expect(systemPrompt).toContain('/test/project/input.md');
      expect(systemPrompt).toContain('/test/project/context.md');
      expect(systemPrompt).toContain('/test/project/plans/');
      expect(systemPrompt).toContain('RAF[project] Plan: <description>');
      expect(systemPrompt).toContain('Immediately verify that the commit landed');
      expect(systemPrompt).toContain('git show --stat --oneline -1');
      expect(systemPrompt).toContain('Do not display the final completion message until that verification passes');
    });
  });

  describe('worktreeMode param (kept for backward compat, ignored)', () => {
    it('should accept worktreeMode without error', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Some project',
        worktreeMode: true,
      };

      expect(() => getPlanningPrompt(params)).not.toThrow();
    });
  });
});
