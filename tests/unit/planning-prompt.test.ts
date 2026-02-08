import { getPlanningPrompt, PlanningPromptParams } from '../../src/prompts/planning.js';

describe('Planning Prompt', () => {
  describe('getPlanningPrompt', () => {
    it('should return systemPrompt and userMessage', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Build a todo app with user authentication',
      };

      const result = getPlanningPrompt(params);

      expect(result).toHaveProperty('systemPrompt');
      expect(result).toHaveProperty('userMessage');
      expect(typeof result.systemPrompt).toBe('string');
      expect(typeof result.userMessage).toBe('string');
      expect(result.systemPrompt.length).toBeGreaterThan(0);
      expect(result.userMessage.length).toBeGreaterThan(0);
    });

    it('should include project path in system prompt', () => {
      const params: PlanningPromptParams = {
        projectPath: '/my/custom/project/path',
        inputContent: 'Some description',
      };

      const { systemPrompt } = getPlanningPrompt(params);

      expect(systemPrompt).toContain('/my/custom/project/path');
    });

    it('should include inputContent in user message', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Build a REST API with Express and MongoDB',
      };

      const { userMessage } = getPlanningPrompt(params);

      expect(userMessage).toContain('Build a REST API with Express and MongoDB');
      expect(userMessage).toContain('planning interview');
    });

    it('should include planning instructions in system prompt', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Some project',
      };

      const { systemPrompt } = getPlanningPrompt(params);

      expect(systemPrompt).toContain('project planning assistant');
      expect(systemPrompt).toContain('RAF');
      expect(systemPrompt).toContain('Identify and Order Tasks');
      expect(systemPrompt).toContain('Interview the User');
      expect(systemPrompt).toContain('Create Plan Files');
      expect(systemPrompt).toContain('AskUserQuestion');
    });

    it('should include decisions file path in system prompt', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Some project',
      };

      const { systemPrompt } = getPlanningPrompt(params);

      expect(systemPrompt).toContain('/test/project/decisions.md');
    });

    it('should include plans directory path in system prompt', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Some project',
      };

      const { systemPrompt } = getPlanningPrompt(params);

      expect(systemPrompt).toContain('/test/project/plans/001-task-name.md');
      expect(systemPrompt).toContain('/test/project/plans/002-task-name.md');
    });

    it('should include task guidelines in system prompt', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Some project',
      };

      const { systemPrompt } = getPlanningPrompt(params);

      expect(systemPrompt).toContain('3-8 distinct');
      expect(systemPrompt).toContain('independently completable');
      expect(systemPrompt).toContain('10-30 minutes');
    });

    it('should include plan file structure template in system prompt', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Some project',
      };

      const { systemPrompt } = getPlanningPrompt(params);

      expect(systemPrompt).toContain('## Objective');
      expect(systemPrompt).toContain('## Context');
      expect(systemPrompt).toContain('## Requirements');
      expect(systemPrompt).toContain('## Implementation Steps');
      expect(systemPrompt).toContain('## Acceptance Criteria');
    });

    it('should include important rules in system prompt', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Some project',
      };

      const { systemPrompt } = getPlanningPrompt(params);

      expect(systemPrompt).toContain('ALWAYS interview the user before creating plans');
      expect(systemPrompt).toContain('numbered order (001, 002, 003');
      expect(systemPrompt).toContain('kebab-case names');
    });

    it('should show raf do without --worktree when worktreeMode is false', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Some project',
        worktreeMode: false,
      };

      const { systemPrompt } = getPlanningPrompt(params);

      expect(systemPrompt).toContain('raf do <project>');
      expect(systemPrompt).not.toContain('--worktree');
    });

    it('should show raf do without --worktree when worktreeMode is undefined', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Some project',
      };

      const { systemPrompt } = getPlanningPrompt(params);

      expect(systemPrompt).toContain('raf do <project>');
      expect(systemPrompt).not.toContain('--worktree');
    });

    it('should show raf do with --worktree when worktreeMode is true', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Some project',
        worktreeMode: true,
      };

      const { systemPrompt } = getPlanningPrompt(params);

      expect(systemPrompt).toContain('raf do <project> --worktree');
    });

    it('should include project description in user message', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Build a dashboard with charts and graphs',
      };

      const { userMessage } = getPlanningPrompt(params);

      // User message should contain the actual project description
      expect(userMessage).toContain('Build a dashboard with charts and graphs');
      expect(userMessage).toContain('project description');
    });
  });
});
