import { jest } from '@jest/globals';
import { logger } from '../../src/utils/logger.js';

describe('Logger', () => {
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleWarnSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logger.clearContext();
    logger.configure({ verbose: false, debug: false });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    logger.clearContext();
  });

  describe('context prefix', () => {
    it('should add context prefix to info messages', () => {
      logger.setContext('[Task 2/5: fix-login]');
      logger.info('Starting task');

      expect(consoleLogSpy).toHaveBeenCalledWith('[Task 2/5: fix-login] Starting task');
    });

    it('should add context prefix to success messages', () => {
      logger.setContext('[Task 1/3: add-feature]');
      logger.success('Task completed');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[Task 1/3: add-feature]'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Task completed'));
    });

    it('should add context prefix to warn messages', () => {
      logger.setContext('[Task 3/4: refactor]');
      logger.warn('Something needs attention');

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[Task 3/4: refactor]'));
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Something needs attention'));
    });

    it('should add context prefix to error messages', () => {
      logger.setContext('[Task 2/2: deploy]');
      logger.error('Something went wrong');

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[Task 2/2: deploy]'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Something went wrong'));
    });

    it('should not add prefix when context is cleared', () => {
      logger.setContext('[Task 1/1: test]');
      logger.clearContext();
      logger.info('No prefix here');

      expect(consoleLogSpy).toHaveBeenCalledWith('No prefix here');
    });

    it('should allow changing context between tasks', () => {
      logger.setContext('[Task 1/3: first]');
      logger.info('First task');
      expect(consoleLogSpy).toHaveBeenLastCalledWith('[Task 1/3: first] First task');

      logger.setContext('[Task 2/3: second]');
      logger.info('Second task');
      expect(consoleLogSpy).toHaveBeenLastCalledWith('[Task 2/3: second] Second task');
    });

    it('should handle empty context string', () => {
      logger.setContext('');
      logger.info('Message');

      expect(consoleLogSpy).toHaveBeenCalledWith('Message');
    });
  });

  describe('verbose_log with context', () => {
    it('should add context prefix when verbose mode is enabled', () => {
      logger.configure({ verbose: true });
      logger.setContext('[Task 1/2: verbose-task]');
      logger.verbose_log('Verbose message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[Task 1/2: verbose-task] Verbose message');
    });

    it('should not log when verbose mode is disabled', () => {
      logger.configure({ verbose: false });
      logger.setContext('[Task 1/2: verbose-task]');
      logger.verbose_log('Verbose message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });
});
