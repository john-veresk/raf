#!/usr/bin/env node

import { Command } from 'commander';
import { createPlanCommand } from './commands/plan.js';
import { createDoCommand } from './commands/do.js';
import { createStatusCommand } from './commands/status.js';
import { getVersion } from './utils/version.js';

const program = new Command();

program
  .name('raf')
  .description('RAF - Automated Task Planning & Execution with Claude Code')
  .version(getVersion());

program.addCommand(createPlanCommand());
program.addCommand(createDoCommand());
program.addCommand(createStatusCommand());

program.parse();
