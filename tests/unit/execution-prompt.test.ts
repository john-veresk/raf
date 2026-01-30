import { getExecutionPrompt, ExecutionPromptParams } from '../../src/prompts/execution.js';

describe('Execution Prompt', () => {
  const baseParams: ExecutionPromptParams = {
    projectPath: '/Users/test/RAF/005-task-naming-improvements',
    planPath: '/Users/test/RAF/005-task-naming-improvements/plans/001-enhance-identifier-resolution.md',
    taskId: '001',
    taskNumber: 1,
    totalTasks: 5,
    previousOutcomes: [],
    autoCommit: true,
    projectName: 'task-naming-improvements',
    projectNumber: '005',
    taskName: 'enhance-identifier-resolution',
  };

  describe('Commit Message Format', () => {
    it('should include RAF commit schema format in prompt', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('RAF[005:001] task-naming-improvements enhance-identifier-resolution');
    });

    it('should zero-pad single digit task numbers', () => {
      const params = { ...baseParams, taskNumber: 1 };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('RAF[005:001]');
    });

    it('should zero-pad double digit task numbers', () => {
      const params = { ...baseParams, taskNumber: 12 };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('RAF[005:012]');
    });

    it('should not pad triple digit task numbers', () => {
      const params = { ...baseParams, taskNumber: 123 };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('RAF[005:123]');
    });

    it('should include project number from base36 prefix', () => {
      const params = { ...baseParams, projectNumber: 'a05' };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('RAF[a05:001]');
    });

    it('should include task name in commit message', () => {
      const params = { ...baseParams, taskName: 'update-execution-prompt' };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('update-execution-prompt');
    });

    it('should include project name in commit message', () => {
      const params = { ...baseParams, projectName: 'my-awesome-project' };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('my-awesome-project');
    });

    it('should not include commit instructions when autoCommit is false', () => {
      const params = { ...baseParams, autoCommit: false };
      const prompt = getExecutionPrompt(params);
      expect(prompt).not.toContain('Git Instructions');
      expect(prompt).not.toContain('RAF[');
    });
  });

  describe('Complete Commit Message', () => {
    it('should generate correct commit message for task 006', () => {
      const params: ExecutionPromptParams = {
        projectPath: '/Users/test/RAF/005-task-naming-improvements',
        planPath: '/Users/test/RAF/005-task-naming-improvements/plans/006-update-execution-prompt.md',
        taskId: '006',
        taskNumber: 6,
        totalTasks: 7,
        previousOutcomes: [],
        autoCommit: true,
        projectName: 'task-naming-improvements',
        projectNumber: '005',
        taskName: 'update-execution-prompt',
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('RAF[005:006] task-naming-improvements update-execution-prompt');
    });

    it('should generate correct commit message for first task', () => {
      const params: ExecutionPromptParams = {
        projectPath: '/Users/test/RAF/001-fix-bug',
        planPath: '/Users/test/RAF/001-fix-bug/plans/001-identify-issue.md',
        taskId: '001',
        taskNumber: 1,
        totalTasks: 3,
        previousOutcomes: [],
        autoCommit: true,
        projectName: 'fix-bug',
        projectNumber: '001',
        taskName: 'identify-issue',
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('RAF[001:001] fix-bug identify-issue');
    });

    it('should generate correct commit message for base36 project', () => {
      const params: ExecutionPromptParams = {
        projectPath: '/Users/test/RAF/a0b-feature-branch',
        planPath: '/Users/test/RAF/a0b-feature-branch/plans/002-implement-feature.md',
        taskId: '002',
        taskNumber: 2,
        totalTasks: 4,
        previousOutcomes: [],
        autoCommit: true,
        projectName: 'feature-branch',
        projectNumber: 'a0b',
        taskName: 'implement-feature',
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('RAF[a0b:002] feature-branch implement-feature');
    });
  });

  describe('Task Information', () => {
    it('should include task number and total', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('Task: 1 of 5');
    });

    it('should include task ID', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('Task ID: 001');
    });

    it('should include project path', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('Project folder: /Users/test/RAF/005-task-naming-improvements');
    });

    it('should include plan path', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('plans/001-enhance-identifier-resolution.md');
    });
  });

  describe('Outcome File Note', () => {
    it('should include outcome file path note when provided', () => {
      const params = {
        ...baseParams,
        outcomeFilePath: '/Users/test/RAF/005-task-naming-improvements/outcomes/001-outcome.md',
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('The outcome file will be written to');
      expect(prompt).toContain('001-outcome.md');
    });

    it('should not include outcome file note when not provided', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).not.toContain('The outcome file will be written to');
    });
  });

  describe('Previous Outcomes', () => {
    it('should include previous outcomes section when outcomes exist', () => {
      const params = {
        ...baseParams,
        previousOutcomes: [
          { taskId: '001', content: '## Status: SUCCESS\n\nTask completed successfully.' },
        ],
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('Previous Task Outcomes');
      expect(prompt).toContain('### Task 001');
      expect(prompt).toContain('## Status: SUCCESS');
    });

    it('should not include previous outcomes section when empty', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).not.toContain('Previous Task Outcomes');
    });
  });
});
