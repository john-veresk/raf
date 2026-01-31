import { getPlanningPrompt, PlanningPromptParams } from '../../src/prompts/planning.js';

describe('Planning Prompt', () => {
  describe('getPlanningPrompt', () => {
    it('should return separate systemPrompt and userMessage', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Build a todo app with user authentication',
      };

      const result = getPlanningPrompt(params);

      expect(result).toHaveProperty('systemPrompt');
      expect(result).toHaveProperty('userMessage');
      expect(typeof result.systemPrompt).toBe('string');
      expect(typeof result.userMessage).toBe('string');
    });

    it('should include project path in systemPrompt', () => {
      const params: PlanningPromptParams = {
        projectPath: '/my/custom/project/path',
        inputContent: 'Some description',
      };

      const { systemPrompt } = getPlanningPrompt(params);

      expect(systemPrompt).toContain('/my/custom/project/path');
    });

    it('should include project description in userMessage', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Build a REST API with Express and MongoDB',
      };

      const { userMessage } = getPlanningPrompt(params);

      expect(userMessage).toContain('Build a REST API with Express and MongoDB');
    });

    it('should include planning instructions in systemPrompt', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Some project',
      };

      const { systemPrompt } = getPlanningPrompt(params);

      expect(systemPrompt).toContain('project planning assistant');
      expect(systemPrompt).toContain('RAF');
      expect(systemPrompt).toContain('Identify Tasks');
      expect(systemPrompt).toContain('Interview the User');
      expect(systemPrompt).toContain('Create Plan Files');
      expect(systemPrompt).toContain('AskUserQuestion');
    });

    it('should include decisions file path in systemPrompt', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Some project',
      };

      const { systemPrompt } = getPlanningPrompt(params);

      expect(systemPrompt).toContain('/test/project/decisions.md');
    });

    it('should include plans directory path in systemPrompt', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Some project',
      };

      const { systemPrompt } = getPlanningPrompt(params);

      expect(systemPrompt).toContain('/test/project/plans/001-task-name.md');
      expect(systemPrompt).toContain('/test/project/plans/002-task-name.md');
    });

    it('should NOT include project description in systemPrompt', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'UNIQUE_PROJECT_DESCRIPTION_TEXT',
      };

      const { systemPrompt } = getPlanningPrompt(params);

      // The project description should only be in userMessage
      expect(systemPrompt).not.toContain('UNIQUE_PROJECT_DESCRIPTION_TEXT');
    });

    it('should NOT include planning instructions in userMessage', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Some project',
      };

      const { userMessage } = getPlanningPrompt(params);

      expect(userMessage).not.toContain('AskUserQuestion');
      expect(userMessage).not.toContain('Create Plan Files');
      expect(userMessage).not.toContain('Important Rules');
    });

    it('should include task guidelines in systemPrompt', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Some project',
      };

      const { systemPrompt } = getPlanningPrompt(params);

      expect(systemPrompt).toContain('3-8 distinct');
      expect(systemPrompt).toContain('independently completable');
      expect(systemPrompt).toContain('10-30 minutes');
    });

    it('should include plan file structure template in systemPrompt', () => {
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

    it('should include important rules in systemPrompt', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Some project',
      };

      const { systemPrompt } = getPlanningPrompt(params);

      expect(systemPrompt).toContain('ALWAYS interview the user before creating plans');
      expect(systemPrompt).toContain('numbered order (001, 002, 003');
      expect(systemPrompt).toContain('kebab-case names');
    });

    it('should trigger Claude to start analyzing in userMessage', () => {
      const params: PlanningPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Build a dashboard',
      };

      const { userMessage } = getPlanningPrompt(params);

      // User message should prompt Claude to take action
      expect(userMessage).toContain('project description');
      expect(userMessage.toLowerCase()).toMatch(/analyze|identify|interview/);
    });
  });
});
