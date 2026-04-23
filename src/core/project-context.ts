import * as fs from 'node:fs';
import { getContextPath } from '../utils/paths.js';

export const DEFAULT_PROJECT_CONTEXT = '# Project Context\n\nNo shared context available yet.\n';

/**
 * Read the shared project context file when it exists.
 * RAF no longer generates or rewrites this file automatically.
 */
export function readProjectContext(projectPath: string): string | null {
  const contextPath = getContextPath(projectPath);
  if (!fs.existsSync(contextPath)) {
    return null;
  }

  return fs.readFileSync(contextPath, 'utf-8');
}
