import { getExecutionPrompt, ExecutionPromptParams, summarizeOutcome } from '../../src/prompts/execution.js';

describe('Execution Prompt', () => {
  const baseParams: ExecutionPromptParams = {
    projectPath: '/Users/test/RAF/aaabmm-task-naming-improvements',
    planPath: '/Users/test/RAF/aaabmm-task-naming-improvements/plans/01-enhance-identifier-resolution.md',
    taskId: '01',
    taskNumber: 1,
    totalTasks: 5,
    previousOutcomes: [],
    autoCommit: true,
    projectNumber: 'aaabmm',
    outcomeFilePath: '/Users/test/RAF/aaabmm-task-naming-improvements/outcomes/01-enhance-identifier-resolution.md',
  };

  describe('Commit Message Format', () => {
    it('should include RAF commit schema format with description placeholder in prompt', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('RAF[aaabmm:01] <description>');
    });

    it('should instruct to write meaningful description', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('Write a concise description of what was accomplished');
      expect(prompt).toContain('Focus on the actual change, not the task name');
    });

    it('should zero-pad single digit task numbers', () => {
      const params = { ...baseParams, taskNumber: 1 };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('RAF[aaabmm:01]');
    });

    it('should zero-pad double digit task numbers', () => {
      const params = { ...baseParams, taskNumber: 12 };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('RAF[aaabmm:0c]');
    });

    it('should encode large task numbers in base36', () => {
      const params = { ...baseParams, taskNumber: 123 };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('RAF[aaabmm:3f]');
    });

    it('should include project number from base26 prefix', () => {
      const params = { ...baseParams, projectNumber: 'abcdef' };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('RAF[abcdef:01]');
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
        projectPath: '/Users/test/RAF/aaabmm-task-naming-improvements',
        planPath: '/Users/test/RAF/aaabmm-task-naming-improvements/plans/06-update-execution-prompt.md',
        taskId: '06',
        taskNumber: 6,
        totalTasks: 7,
        previousOutcomes: [],
        autoCommit: true,
        projectNumber: 'aaabmm',
        outcomeFilePath: '/Users/test/RAF/aaabmm-task-naming-improvements/outcomes/06-update-execution-prompt.md',
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('RAF[aaabmm:06] <description>');
    });

    it('should generate correct commit message format for first task', () => {
      const params: ExecutionPromptParams = {
        projectPath: '/Users/test/RAF/aaaaab-fix-bug',
        planPath: '/Users/test/RAF/aaaaab-fix-bug/plans/01-identify-issue.md',
        taskId: '01',
        taskNumber: 1,
        totalTasks: 3,
        previousOutcomes: [],
        autoCommit: true,
        projectNumber: 'aaaaab',
        outcomeFilePath: '/Users/test/RAF/aaaaab-fix-bug/outcomes/01-identify-issue.md',
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('RAF[aaaaab:01] <description>');
    });

    it('should generate correct commit message format for base26 project', () => {
      const params: ExecutionPromptParams = {
        projectPath: '/Users/test/RAF/abcdef-feature-branch',
        planPath: '/Users/test/RAF/abcdef-feature-branch/plans/02-implement-feature.md',
        taskId: '02',
        taskNumber: 2,
        totalTasks: 4,
        previousOutcomes: [],
        autoCommit: true,
        projectNumber: 'abcdef',
        outcomeFilePath: '/Users/test/RAF/abcdef-feature-branch/outcomes/02-implement-feature.md',
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('RAF[abcdef:02] <description>');
    });
  });

  describe('Task Information', () => {
    it('should include task number and total', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('Task: 1 of 5');
    });

    it('should include task ID', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('Task ID: 01');
    });

    it('should include project path', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('Project folder: /Users/test/RAF/aaabmm-task-naming-improvements');
    });

    it('should include plan path', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).toContain('plans/01-enhance-identifier-resolution.md');
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
          { taskId: '01', content: '## Status: SUCCESS\n\nTask completed successfully.' },
        ],
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('Previous Task Outcomes');
      expect(prompt).toContain('### Task 01');
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
        previousOutcomeFile: '/Users/test/RAF/aaabmm-task-naming-improvements/outcomes/01-enhance-identifier-resolution.md',
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('## Retry Context');
      expect(prompt).toContain('This is attempt 2');
      expect(prompt).toContain('**Previous outcome file**: /Users/test/RAF/aaabmm-task-naming-improvements/outcomes/01-enhance-identifier-resolution.md');
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

  describe('Dependency Context', () => {
    it('should not include dependency context when task has no dependencies', () => {
      const prompt = getExecutionPrompt(baseParams);
      expect(prompt).not.toContain('Dependency Context');
    });

    it('should not include dependency context when dependencyIds is empty', () => {
      const params = {
        ...baseParams,
        dependencyIds: [],
        dependencyOutcomes: [],
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).not.toContain('Dependency Context');
    });

    it('should not include dependency context when dependencyOutcomes is empty', () => {
      const params = {
        ...baseParams,
        dependencyIds: ['01'],
        dependencyOutcomes: [],
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).not.toContain('Dependency Context');
    });

    it('should include dependency context when task has dependencies with outcomes', () => {
      const params = {
        ...baseParams,
        taskId: '02',
        taskNumber: 2,
        dependencyIds: ['01'],
        dependencyOutcomes: [
          { taskId: '01', content: '## Summary\n\nImplemented the base feature.\n\n<promise>COMPLETE</promise>' },
        ],
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('## Dependency Context');
      expect(prompt).toContain('**Dependencies**: 01');
      expect(prompt).toContain('### Task 01');
      expect(prompt).toContain('Implemented the base feature');
    });

    it('should include multiple dependency outcomes', () => {
      const params = {
        ...baseParams,
        taskId: '03',
        taskNumber: 3,
        dependencyIds: ['01', '02'],
        dependencyOutcomes: [
          { taskId: '01', content: '## Summary\n\nFirst task done.\n\n<promise>COMPLETE</promise>' },
          { taskId: '02', content: '## Summary\n\nSecond task done.\n\n<promise>COMPLETE</promise>' },
        ],
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('**Dependencies**: 01, 02');
      expect(prompt).toContain('### Task 01');
      expect(prompt).toContain('First task done');
      expect(prompt).toContain('### Task 02');
      expect(prompt).toContain('Second task done');
    });

    it('should explain purpose of dependency context', () => {
      const params = {
        ...baseParams,
        taskId: '02',
        taskNumber: 2,
        dependencyIds: ['01'],
        dependencyOutcomes: [
          { taskId: '01', content: '## Summary\n\nDone.\n\n<promise>COMPLETE</promise>' },
        ],
      };
      const prompt = getExecutionPrompt(params);
      expect(prompt).toContain('depends on the following completed tasks');
      expect(prompt).toContain('Review their outcomes to understand what was accomplished');
      expect(prompt).toContain('build upon their work');
    });

    it('should place dependency context before previous outcomes section', () => {
      const params = {
        ...baseParams,
        taskId: '03',
        taskNumber: 3,
        previousOutcomes: [
          { taskId: '01', content: 'Previous outcome 1' },
          { taskId: '02', content: 'Previous outcome 2' },
        ],
        dependencyIds: ['01'],
        dependencyOutcomes: [
          { taskId: '01', content: '## Summary\n\nDependency work.\n\n<promise>COMPLETE</promise>' },
        ],
      };
      const prompt = getExecutionPrompt(params);
      const depContextIndex = prompt.indexOf('## Dependency Context');
      const prevOutcomesIndex = prompt.indexOf('## Previous Task Outcomes');
      expect(depContextIndex).toBeGreaterThan(-1);
      expect(prevOutcomesIndex).toBeGreaterThan(-1);
      expect(depContextIndex).toBeLessThan(prevOutcomesIndex);
    });
  });

  describe('summarizeOutcome', () => {
    it('should return content as-is when under size limit', () => {
      const content = '## Summary\n\nShort content.\n\n<promise>COMPLETE</promise>';
      const result = summarizeOutcome(content);
      expect(result).toBe(content);
    });

    it('should extract Summary section when content is too long', () => {
      const summary = 'This is the summary of what was done.';
      const longContent = `## Summary\n\n${summary}\n\n## Details\n\n${'x'.repeat(5000)}\n\n<promise>COMPLETE</promise>`;
      const result = summarizeOutcome(longContent);
      expect(result).toContain(summary);
      expect(result).toContain('[Outcome truncated for context size]');
    });

    it('should truncate at reasonable break point when no Summary section', () => {
      const longContent = 'x'.repeat(5000);
      const result = summarizeOutcome(longContent);
      expect(result.length).toBeLessThan(5000);
      expect(result).toContain('[Outcome truncated for context size]');
    });

    it('should prefer newline as break point when truncating', () => {
      const content = 'First line.\nSecond line.\n' + 'x'.repeat(5000);
      const result = summarizeOutcome(content);
      expect(result).toContain('[Outcome truncated for context size]');
    });
  });
});
