import * as pty from 'node-pty';
import type { IDisposable } from 'node-pty';
import { execSync } from 'node:child_process';

function getPtyCount(): number {
  // Count open file descriptors for this process
  try {
    const result = execSync(`lsof -p ${process.pid} 2>/dev/null | grep -c "/dev/pty\\|/dev/ttys" || echo 0`, { encoding: 'utf-8' });
    return parseInt(result.trim(), 10);
  } catch {
    return 0;
  }
}

async function spawnAndCleanup(withCleanup: boolean): Promise<void> {
  return new Promise((resolve) => {
    const ptyProcess = pty.spawn('echo', ['hello'], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
    });

    const disposables: IDisposable[] = [];

    disposables.push(ptyProcess.onData(() => {
      // ignore data
    }));

    disposables.push(ptyProcess.onExit(() => {
      if (withCleanup) {
        // Proper cleanup
        for (const d of disposables) {
          try { d.dispose(); } catch {}
        }
        try { ptyProcess.kill(); } catch {}
      }
      resolve();
    }));
  });
}

async function main() {
  const iterations = 20;

  console.log('Testing PTY cleanup...\n');

  // Test WITHOUT cleanup
  console.log('=== Without proper cleanup ===');
  const beforeNoCleanup = getPtyCount();
  console.log(`PTY FDs before: ${beforeNoCleanup}`);

  for (let i = 0; i < iterations; i++) {
    await spawnAndCleanup(false);
  }

  // Give time for any cleanup
  await new Promise(r => setTimeout(r, 500));
  const afterNoCleanup = getPtyCount();
  console.log(`PTY FDs after ${iterations} spawns: ${afterNoCleanup}`);
  console.log(`Leaked: ${afterNoCleanup - beforeNoCleanup}\n`);

  // Test WITH cleanup
  console.log('=== With proper cleanup ===');
  const beforeCleanup = getPtyCount();
  console.log(`PTY FDs before: ${beforeCleanup}`);

  for (let i = 0; i < iterations; i++) {
    await spawnAndCleanup(true);
  }

  // Give time for any cleanup
  await new Promise(r => setTimeout(r, 500));
  const afterCleanup = getPtyCount();
  console.log(`PTY FDs after ${iterations} spawns: ${afterCleanup}`);
  console.log(`Leaked: ${afterCleanup - beforeCleanup}\n`);

  // Summary
  console.log('=== Summary ===');
  if (afterCleanup - beforeCleanup === 0) {
    console.log('✓ Proper cleanup prevents PTY leaks');
  } else {
    console.log('✗ Still leaking PTYs even with cleanup');
  }
}

main().catch(console.error);
