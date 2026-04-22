import { getAmendPrompt, AmendPromptParams } from '../../src/prompts/amend.js';

describe('Amend Prompt', () => {
  const baseParams: AmendPromptParams = {
    projectPath: '/test/project',
    contextContent: '# Project Context\n\n## Goal\nTest goal\n',
    existingTasks: [
      {
        id: '01',
        status: 'completed',
        planFile: 'plans/01-setup.md',
        taskName: 'setup',
      },
      {
        id: '02',
        status: 'pending',
        planFile: 'plans/02-feature.md',
        taskName: 'feature',
      },
      {
        id: '03',
        status: 'failed',
        planFile: 'plans/03-broken.md',
        taskName: 'broken',
      },
    ],
    nextTaskNumber: 4,
    newTaskDescription: 'Add a new feature',
    harness: 'claude',
  };

  describe('basic API', () => {
    it('should return systemPrompt and userMessage', () => {
      const result = getAmendPrompt(baseParams);

      expect(result).toHaveProperty('systemPrompt');
      expect(result).toHaveProperty('userMessage');
      expect(typeof result.systemPrompt).toBe('string');
      expect(typeof result.userMessage).toBe('string');
      expect(result.systemPrompt.length).toBeGreaterThan(0);
      expect(result.userMessage.length).toBeGreaterThan(0);
    });

    it('should include project path in system prompt', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);
      expect(systemPrompt).toContain('/test/project');
    });

    it('should interpolate projectPath into context.md, plans/, and outcomes/', () => {
      const params: AmendPromptParams = {
        ...baseParams,
        projectPath: '/my/custom/path',
      };
      const { systemPrompt } = getAmendPrompt(params);

      expect(systemPrompt).toContain('/my/custom/path/context.md');
      expect(systemPrompt).toContain('/my/custom/path/plans/');
      expect(systemPrompt).toContain('/my/custom/path/outcomes/');
    });

    it('should include new task description in user message', () => {
      const { userMessage } = getAmendPrompt(baseParams);
      expect(userMessage).toContain('Add a new feature');
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
      const { systemPrompt } = getAmendPrompt(baseParams);
      expect(systemPrompt).toContain(principle);
    });
  });

  describe('amendment-specific context', () => {
    it('should include existing task markers', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);

      expect(systemPrompt).toContain('Task 01');
      expect(systemPrompt).toContain('Task 02');
      expect(systemPrompt).toContain('Task 03');
      expect(systemPrompt).toContain('[COMPLETED]');
      expect(systemPrompt).toContain('[PENDING]');
      expect(systemPrompt).toContain('[FAILED]');
    });

    it('should include PROTECTED and MODIFIABLE markers', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);

      expect(systemPrompt).toContain('[PROTECTED]');
      expect(systemPrompt).toContain('[MODIFIABLE]');
    });

    it('should list protected and modifiable tasks separately', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);

      expect(systemPrompt).toContain('### Protected (COMPLETED)');
      expect(systemPrompt).toContain('### Modifiable (PENDING/FAILED)');
    });

    it('should include next task number', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);
      expect(systemPrompt).toContain('New tasks start from number 4');
    });

    it('should include amendment mode rules', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);

      expect(systemPrompt).toContain('NEVER modify');
      expect(systemPrompt).toContain('Do NOT renumber');
    });

    it('should include outcome reference for completed tasks', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);
      expect(systemPrompt).toContain('Outcome: /test/project/outcomes/01-setup.md');
    });

    it('should require checking PROTECTED boundaries during critique', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);
      expect(systemPrompt).toMatch(/critique.*PROTECTED/i);
    });
  });

  describe('condensed flow', () => {
    it('should express draft → self-critique → revise → write as one sentence', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);

      expect(systemPrompt).toContain('draft');
      expect(systemPrompt).toContain('self-critique');
      expect(systemPrompt).toContain('revise');
      expect(systemPrompt).toContain('write the file');
    });
  });

  describe('minimum-viable plan template', () => {
    it('should include required sections', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);

      expect(systemPrompt).toContain('## Objective');
      expect(systemPrompt).toContain('## Requirements');
      expect(systemPrompt).toContain('## Acceptance Criteria');
    });

    it('should include effort frontmatter', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);

      expect(systemPrompt).toContain('effort:');
      expect(systemPrompt).toMatch(/effort.*REQUIRED/);
    });
  });

  describe('exploration and interview directives', () => {
    it('should use AskUserQuestion for Claude and not request_user_input', () => {
      const { systemPrompt } = getAmendPrompt({
        ...baseParams,
        harness: 'claude',
      });

      expect(systemPrompt).toContain('AskUserQuestion');
      expect(systemPrompt).not.toContain('request_user_input');
    });

    it('should use request_user_input for Codex and not AskUserQuestion', () => {
      const { systemPrompt } = getAmendPrompt({
        ...baseParams,
        harness: 'codex',
      });

      expect(systemPrompt).toContain('request_user_input');
      expect(systemPrompt).not.toContain('AskUserQuestion');
      expect(systemPrompt).toMatch(/short architectural\/foundational questions first/i);
      expect(systemPrompt).toContain('2-3 mutually exclusive choices');
      expect(systemPrompt).toContain('/test/project/context.md');
    });

    it('should call out lifecycle tracing in exploration', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);
      expect(systemPrompt).toMatch(/creation.*storage.*consumption/);
    });

    it('should direct architectural questions before tactical ones', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);
      expect(systemPrompt).toMatch(/architectural.*first/i);
      expect(systemPrompt).toMatch(/tactical.*after/i);
    });

    it('should require reconciling contradictions before planning', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);
      expect(systemPrompt).toContain('reconcile');
      expect(systemPrompt).toContain('before proceeding');
    });

    it('should direct using context.md plus task-specific files', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);
      expect(systemPrompt).toContain('context.md');
      expect(systemPrompt).not.toContain('decisions.md');
    });

    it('should instruct amend flows to revise the stored goal when scope changes', () => {
      const { systemPrompt } = getAmendPrompt(baseParams);

      expect(systemPrompt).toContain('/test/project/context.md');
      expect(systemPrompt).toContain('## Goal');
      expect(systemPrompt).toMatch(/materially changes scope|reframes/i);
      expect(systemPrompt).toMatch(/clarified summary/i);
    });
  });
});
