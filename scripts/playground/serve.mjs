import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';

const DEFAULT_PORT = 9400;
const PID_PATH = path.resolve('.wp-playground.pid');

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

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

function writePid(pid) {
  fs.writeFileSync(PID_PATH, `${pid}\n`);
}

function clearPid() {
  try {
    fs.unlinkSync(PID_PATH);
  } catch {
    // ignore
  }
}

function checkPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net
      .createConnection({ port, host: '127.0.0.1' })
      .once('connect', () => {
        socket.end();
        resolve(true);
      })
      .once('error', () => resolve(false));

    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const port = Number(process.env.PLAYGROUND_PORT ?? DEFAULT_PORT);
  if (!Number.isFinite(port)) throw new Error('Invalid PLAYGROUND_PORT');

  const inUse = await checkPortInUse(port);
  if (inUse) {
    const pid = readPid();
    if (pid && isPidAlive(pid)) {
      process.stdout.write(`WP Playground already running: http://127.0.0.1:${port}/ (pid ${pid})\n`);
      return;
    }
    process.stdout.write(
      `Port ${port} is already in use. Stop the process using it or run with PLAYGROUND_PORT=<port>.\n`
    );
    process.exitCode = 1;
    return;
  }

  clearPid();

  const args = [
    'wp-playground-cli',
    'server',
    `--port=${port}`,
    '--php=8.3',
    '--mount-dir',
    './wp-content/themes/lucid-hatamex-clone-theme',
    '/wordpress/wp-content/themes/lucid-hatamex-clone-theme',
    '--blueprint',
    './scripts/playground/blueprint.json',
    '--blueprint-may-read-adjacent-files',
  ];

  const child = spawn('npx', args, { stdio: 'inherit' });
  writePid(child.pid);

  const cleanup = () => clearPid();
  child.on('exit', cleanup);
  child.on('error', cleanup);
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

