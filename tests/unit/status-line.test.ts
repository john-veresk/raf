import { jest } from '@jest/globals';
import { createStatusLine } from '../../src/utils/status-line.js';

describe('StatusLine', () => {
  let originalIsTTY: boolean | undefined;
  let originalWrite: typeof process.stdout.write;
  let writeOutput: string[];

  beforeEach(() => {
    originalIsTTY = process.stdout.isTTY;
    originalWrite = process.stdout.write;
    writeOutput = [];

    // Mock stdout.write to capture output
    process.stdout.write = jest.fn((data: string | Uint8Array) => {
      writeOutput.push(data.toString());
      return true;
    }) as typeof process.stdout.write;
  });

  afterEach(() => {
    process.stdout.isTTY = originalIsTTY;
    process.stdout.write = originalWrite;
  });

  describe('when stdout is TTY', () => {
    beforeEach(() => {
      process.stdout.isTTY = true;
    });

    it('should write text with carriage return prefix', () => {
      const statusLine = createStatusLine();
      statusLine.update('Hello');

      expect(writeOutput).toHaveLength(1);
      expect(writeOutput[0]).toContain('\r');
      expect(writeOutput[0]).toContain('Hello');
    });

    it('should clear previous content before writing new', () => {
      const statusLine = createStatusLine();
      statusLine.update('Short');
      writeOutput = [];

      statusLine.update('A');
      // Should clear 5 chars (length of 'Short') before writing 'A'
      expect(writeOutput[0]).toContain('     ');
      expect(writeOutput[0]).toContain('A');
    });

    it('should clear line completely when clear() is called', () => {
      const statusLine = createStatusLine();
      statusLine.update('Test');
      writeOutput = [];

      statusLine.clear();
      // Should clear 4 chars and reset
      expect(writeOutput[0]).toContain('\r');
    });

    it('should not write again after clear() until update() is called', () => {
      const statusLine = createStatusLine();
      statusLine.update('Test');
      statusLine.clear();
      writeOutput = [];

      statusLine.clear();
      expect(writeOutput).toHaveLength(0);
    });
  });

  describe('when stdout is not TTY', () => {
    beforeEach(() => {
      process.stdout.isTTY = false;
    });

    it('should not write anything on update', () => {
      const statusLine = createStatusLine();
      statusLine.update('Hello');

      expect(writeOutput).toHaveLength(0);
    });

    it('should not write anything on clear', () => {
      const statusLine = createStatusLine();
      statusLine.update('Hello');
      statusLine.clear();

      expect(writeOutput).toHaveLength(0);
    });
  });
});
