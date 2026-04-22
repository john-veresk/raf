import type { IPty } from 'node-pty';

type TerminalLike = Pick<NodeJS.WriteStream, 'isTTY' | 'columns' | 'rows' | 'on' | 'off'>;

function isPositiveDimension(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function forwardTerminalResize(
  ptyProcess: Pick<IPty, 'resize'>,
  stdout: TerminalLike = process.stdout,
): () => void {
  if (!stdout.isTTY) {
    return () => {};
  }

  const onResize = (): void => {
    if (!isPositiveDimension(stdout.columns) || !isPositiveDimension(stdout.rows)) {
      return;
    }

    try {
      ptyProcess.resize(stdout.columns, stdout.rows);
    } catch {
      // Ignore resize races during shutdown.
    }
  };

  stdout.on('resize', onResize);

  return () => {
    stdout.off('resize', onResize);
  };
}
