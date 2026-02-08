import { getAmendPrompt, AmendPromptParams } from '../../src/prompts/amend.js';

describe('Amend Prompt', () => {
  const baseParams: AmendPromptParams = {
    projectPath: '/test/project',
    existingTasks: [
      {
        id: '001',
        status: 'completed',
        planFile: 'plans/001-setup.md',
        taskName: 'setup',
      },
      {
        id: '002',
        status: 'pending',
        planFile: 'plans/002-feature.md',
        taskName: 'feature',
      },
    ],
    nextTaskNumber: 3,
    newTaskDescription: 'Add a new feature',
  };

  describe('getAmendPrompt', () => {
    it('should return systemPrompt and userMessage', () => {
      const result = getAmendPrompt(baseParams);

      expect(result).toHaveProperty('systemPrompt');
      expect(result).toHaveProperty('userMessage');
      expect(typeof result.systemPrompt).toBe('string');
      expect(typeof result.userMessage).toBe('string');
    });

    it('should include project path in system prompt', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);

      expect(systemPrompt).toContain('/test/project');
    });

    it('should include existing tasks in system prompt', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);

      expect(systemPrompt).toContain('Task 001');
      expect(systemPrompt).toContain('Task 002');
      expect(systemPrompt).toContain('[COMPLETED]');
      expect(systemPrompt).toContain('[PENDING]');
    });

    it('should show raf do without --worktree when worktreeMode is false', () => {
      const params: AmendPromptParams = {
        ...baseParams,
        worktreeMode: false,
      };

      const { systemPrompt } = getAmendPrompt(params);

      expect(systemPrompt).toContain('raf do <project>');
      expect(systemPrompt).not.toContain('--worktree');
    });

    it('should show raf do without --worktree when worktreeMode is undefined', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);

      expect(systemPrompt).toContain('raf do <project>');
      expect(systemPrompt).not.toContain('--worktree');
    });

    it('should show raf do with --worktree when worktreeMode is true', () => {
      const params: AmendPromptParams = {
        ...baseParams,
        worktreeMode: true,
      };

      const { systemPrompt } = getAmendPrompt(params);

      expect(systemPrompt).toContain('raf do <project> --worktree');
    });

    it('should include new task description in user message', () => {
      const { userMessage } = getAmendPrompt(baseParams);

      expect(userMessage).toContain('Add a new feature');
    });
  });
});
