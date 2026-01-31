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

  describe('print', () => {
    it('should output text exactly as passed', () => {
      logger.print('Hello World');
      expect(consoleLogSpy).toHaveBeenCalledWith('Hello World');
    });

    it('should pass additional arguments through', () => {
      logger.print('Value: %d', 42);
      expect(consoleLogSpy).toHaveBeenCalledWith('Value: %d', 42);
    });

    it('should not add any prefix', () => {
      logger.print('raw text');
      expect(consoleLogSpy).toHaveBeenCalledWith('raw text');
    });
  });

  describe('info', () => {
    it('should output message without prefix', () => {
      logger.info('Starting task');
      expect(consoleLogSpy).toHaveBeenCalledWith('Starting task');
    });
  });

  describe('success', () => {
    it('should output with ✓ prefix', () => {
      logger.success('Task completed');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Task completed');
    });
  });

  describe('warn', () => {
    it('should output with ⚠️ prefix', () => {
      logger.warn('Something needs attention');
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  Something needs attention');
    });
  });

  describe('error', () => {
    it('should output with ✗ prefix', () => {
      logger.error('Something went wrong');
      expect(consoleErrorSpy).toHaveBeenCalledWith('✗ Something went wrong');
    });
  });

  describe('context methods (deprecated)', () => {
    it('setContext should be a no-op', () => {
      logger.setContext('[Task 2/5: fix-login]');
      logger.info('Starting task');
      // Context should NOT be applied - it's a no-op
      expect(consoleLogSpy).toHaveBeenCalledWith('Starting task');
    });

    it('clearContext should be a no-op', () => {
      logger.setContext('[Task 1/1: test]');
      logger.clearContext();
      logger.info('No prefix here');
      expect(consoleLogSpy).toHaveBeenCalledWith('No prefix here');
    });
  });

  describe('verbose_log', () => {
    it('should log when verbose mode is enabled', () => {
      logger.configure({ verbose: true });
      logger.verbose_log('Verbose message');
      expect(consoleLogSpy).toHaveBeenCalledWith('Verbose message');
    });

    it('should not log when verbose mode is disabled', () => {
      logger.configure({ verbose: false });
      logger.verbose_log('Verbose message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log when debug mode is enabled', () => {
      logger.configure({ debug: true });
      logger.verbose_log('Verbose message');
      expect(consoleLogSpy).toHaveBeenCalledWith('Verbose message');
    });
  });

  describe('debug', () => {
    it('should log with [DEBUG] prefix when debug mode is enabled', () => {
      logger.configure({ debug: true });
      logger.debug('Debug message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG] Debug message');
    });

    it('should not log when debug mode is disabled', () => {
      logger.configure({ debug: false });
      logger.debug('Debug message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('task', () => {
    it('should output status and name', () => {
      logger.task('●', 'running-task');
      expect(consoleLogSpy).toHaveBeenCalledWith('● running-task');
    });
  });

  describe('newline', () => {
    it('should output an empty line', () => {
      logger.newline();
      expect(consoleLogSpy).toHaveBeenCalledWith();
    });
  });
});
