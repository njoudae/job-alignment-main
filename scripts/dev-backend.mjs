import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const backendDir = join(root, 'backend');
const isWindows = process.platform === 'win32';
const venvPython = join(backendDir, '.venv', isWindows ? 'Scripts/python.exe' : 'bin/python');
const python = existsSync(venvPython) ? venvPython : (isWindows ? 'python' : 'python3');

const child = spawn(
  python,
  ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'],
  {
    cwd: backendDir,
    stdio: 'inherit',
    shell: false,
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
