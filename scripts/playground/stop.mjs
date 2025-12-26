import fs from 'node:fs';
import path from 'node:path';

const PID_PATH = path.resolve('.wp-playground.pid');

function readPid() {
  try {
    const raw = fs.readFileSync(PID_PATH, 'utf8').trim();
    if (!raw) return null;
    const pid = Number(raw);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

function clearPid() {
  try {
    fs.unlinkSync(PID_PATH);
  } catch {
    // ignore
  }
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const pid = readPid();
  if (!pid) {
    process.stdout.write('No running WP Playground instance found.\n');
    clearPid();
    return;
  }

  if (!isPidAlive(pid)) {
    process.stdout.write(`Stale pid file (pid ${pid}).\n`);
    clearPid();
    return;
  }

  process.kill(pid, 'SIGTERM');
  process.stdout.write(`Stopped WP Playground (pid ${pid}).\n`);
  clearPid();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

