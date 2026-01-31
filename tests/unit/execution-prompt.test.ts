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
    projectNumber: '005',
    outcomeFilePath: '/Users/test/RAF/005-task-naming-improvements/outcomes/001-enhance-identifier-resolution.md',
  };

  describe('Commit Message Format', () => {
    it('should include RAF commit schema format with description placeholder in prompt', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('RAF[005:001] <description>');
    });

    it('should instruct to write meaningful description', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('Write a concise description of what was accomplished');
      expect(prompt).toContain('Focus on the actual change, not the task name');
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

    it('should not include commit instructions when autoCommit is false', () => {
      const params = { ...baseParams, autoCommit: false };
      const prompt = getExecutionPrompt(params);
      expect(prompt).not.toContain('Git Instructions');
      expect(prompt).not.toContain('RAF[');
    });

    it('should include instruction not to commit on failure', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('On Failure');
      expect(prompt).toContain('do NOT commit');
      expect(prompt).toContain('<promise>FAILED</promise>');
    });

    it('should not include failure commit instruction when autoCommit is false', () => {
      const params = { ...baseParams, autoCommit: false };
      const prompt = getExecutionPrompt(params);
      expect(prompt).not.toContain('On Failure');
      expect(prompt).not.toContain('do NOT commit');
    });
  });

  describe('Complete Commit Message', () => {
    it('should generate correct commit message format for task 006', () => {
      const params: ExecutionPromptParams = {
        projectPath: '/Users/test/RAF/005-task-naming-improvements',
        planPath: '/Users/test/RAF/005-task-naming-improvements/plans/006-update-execution-prompt.md',
        taskId: '006',
        taskNumber: 6,
        totalTasks: 7,
        previousOutcomes: [],
        autoCommit: true,
        projectNumber: '005',
        outcomeFilePath: '/Users/test/RAF/005-task-naming-improvements/outcomes/006-update-execution-prompt.md',
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('RAF[005:006] <description>');
    });

    it('should generate correct commit message format for first task', () => {
      const params: ExecutionPromptParams = {
        projectPath: '/Users/test/RAF/001-fix-bug',
        planPath: '/Users/test/RAF/001-fix-bug/plans/001-identify-issue.md',
        taskId: '001',
        taskNumber: 1,
        totalTasks: 3,
        previousOutcomes: [],
        autoCommit: true,
        projectNumber: '001',
        outcomeFilePath: '/Users/test/RAF/001-fix-bug/outcomes/001-identify-issue.md',
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('RAF[001:001] <description>');
    });

    it('should generate correct commit message format for base36 project', () => {
      const params: ExecutionPromptParams = {
        projectPath: '/Users/test/RAF/a0b-feature-branch',
        planPath: '/Users/test/RAF/a0b-feature-branch/plans/002-implement-feature.md',
        taskId: '002',
        taskNumber: 2,
        totalTasks: 4,
        previousOutcomes: [],
        autoCommit: true,
        projectNumber: 'a0b',
        outcomeFilePath: '/Users/test/RAF/a0b-feature-branch/outcomes/002-implement-feature.md',
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('RAF[a0b:002] <description>');
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

  describe('Outcome File Instructions', () => {
    it('should include outcome file path in prompt', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('Outcome file path');
      expect(prompt).toContain(baseParams.outcomeFilePath);
    });

    it('should include instructions for writing outcome file', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('You MUST write an outcome file');
      expect(prompt).toContain('summary of what was done');
    });

    it('should specify that completion marker must be at end of file', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('MUST end with one of these markers');
      expect(prompt).toContain('<promise>COMPLETE</promise>');
      expect(prompt).toContain('<promise>FAILED</promise>');
    });

    it('should distinguish between code tasks and documentation tasks', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('For code tasks');
      expect(prompt).toContain('For documentation/report tasks');
    });

    it('should instruct that marker is last line in outcome file', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('completion marker MUST be the LAST line in the outcome file');
    });
  });

  describe('Commit Workflow Rules', () => {
    it('should include rule to commit code and outcome together on success', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('On SUCCESS: Commit code changes AND outcome file together');
    });

    it('should include rule not to commit on failure', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('On FAILURE: Do NOT commit');
    });

    it('should specify that changes are preserved for debugging on failure', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('preserved for debugging');
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

  describe('Retry Context', () => {
    it('should not include retry context on first attempt', () => {
      const params = {
        ...baseParams,
        attemptNumber: 1,
        previousOutcomeFile: '/path/to/outcome.md',
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).not.toContain('Retry Context');
    });

    it('should not include retry context when attemptNumber is not provided', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).not.toContain('Retry Context');
    });

    it('should include retry context on second attempt with previous outcome file', () => {
      const params = {
        ...baseParams,
        attemptNumber: 2,
        previousOutcomeFile: '/Users/test/RAF/005-task-naming-improvements/outcomes/001-enhance-identifier-resolution.md',
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('## Retry Context');
      expect(prompt).toContain('This is attempt 2');
      expect(prompt).toContain('**Previous outcome file**: /Users/test/RAF/005-task-naming-improvements/outcomes/001-enhance-identifier-resolution.md');
    });

    it('should include retry context on third attempt', () => {
      const params = {
        ...baseParams,
        attemptNumber: 3,
        previousOutcomeFile: '/path/to/outcome.md',
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('This is attempt 3');
    });

    it('should not include retry context on second attempt without previous outcome file', () => {
      const params = {
        ...baseParams,
        attemptNumber: 2,
        previousOutcomeFile: undefined,
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).not.toContain('Retry Context');
    });

    it('should instruct to read previous outcome file and avoid same mistakes', () => {
      const params = {
        ...baseParams,
        attemptNumber: 2,
        previousOutcomeFile: '/path/to/outcome.md',
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('Read the previous outcome file first');
      expect(prompt).toContain('Understand what was attempted and why it failed');
      expect(prompt).toContain('Account for the previous failure in your approach');
      expect(prompt).toContain('Avoid making the same mistakes');
    });
  });
});
