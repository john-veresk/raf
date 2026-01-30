#!/usr/bin/env node

import { Command } from 'commander';
import { createPlanCommand } from './commands/plan.js';
import { createDoCommand } from './commands/do.js';
import { createStatusCommand } from './commands/status.js';

const program = new Command();

program
  .name('raf')
  .description('RAF - Automated Task Planning & Execution with Claude Code')
  .version('1.0.0');

program.addCommand(createPlanCommand());
program.addCommand(createDoCommand());
program.addCommand(createStatusCommand());

program.parse();
