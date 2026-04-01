//@ts-check

const fs = require('fs');
const moduleTarget = process.env.PTY_REQUIRE_PATH || '../lib/index';
const pty = require(moduleTarget);

function fdCount() {
  try {
    return fs.readdirSync('/dev/fd').length;
  } catch {
    return -1;
  }
}

async function main() {
  const iterations = Number(process.env.PTY_ITERATIONS || 100);
  const sampleEvery = Number(process.env.PTY_SAMPLE_EVERY || 20);
  const shell = process.env.SHELL || '/bin/zsh';

  console.log(`module ${moduleTarget}`);
  console.log(`start fd ${fdCount()}`);

  for (let i = 0; i < iterations; i++) {
    const term = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: process.env,
    });

    await new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        try {
          term.kill();
        } catch {}
        reject(new Error(`Timed out waiting for PTY exit at iteration ${i + 1}`));
      }, 5000);

      term.onExit(() => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve();
      });

      setTimeout(() => term.write('exit\r'), 10);
    });

    if ((i + 1) % sampleEvery === 0 || i === 0 || i + 1 === iterations) {
      console.log(`iter ${i + 1} fd ${fdCount()}`);
    }
  }

  console.log(`end fd ${fdCount()}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
