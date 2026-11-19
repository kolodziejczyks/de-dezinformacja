import { spawn } from 'node:child_process';

const children = ['start:api', 'start'].map((script) =>
  spawn('npm', ['run', script], {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  }),
);

let stopping = false;

function stop(code) {
  if (stopping) {
    return;
  }
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null || !child.pid) {
      continue;
    }
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { shell: true });
    } else {
      child.kill('SIGTERM');
    }
  }
  setTimeout(() => process.exit(code), 300);
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

for (const child of children) {
  child.on('exit', (code) => {
    if (!stopping) {
      stop(code ?? 0);
    }
  });
}
