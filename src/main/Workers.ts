import { ChildProcess, fork } from 'child_process';
import { app } from 'electron';
import path from 'path';
import { tl } from '../shared/i18n-log';
import { registerWorker, unregisterWorker } from './IPC';
import { readLocaleConfigSync } from './i18n';

const workers: Set<ChildProcess> = new Set();

export function getWorkers(): Set<ChildProcess> {
  return new Set(workers);
}

export async function spawnNewWorker(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const locale =
        readLocaleConfigSync(app.getPath('userData')) ?? app.getLocale();
      const workerEnv = { ...process.env, LOCALE: locale };
      const worker = !app.isPackaged
        ? fork('./src/main/worker/worker.ts', [], {
            execArgv: ['-r', 'ts-node/register/transpile-only'],
            env: workerEnv,
          })
        : fork(path.join(__dirname, 'worker.js'), [], { env: workerEnv });

      worker.on('error', (error) => {
        console.error(tl('main.worker.error'), error);
      });

      worker.on('spawn', () => {
        workers.delete(worker);
        registerWorker(worker);
        resolve();
      });

      worker.on('exit', (code, sign) => {
        console.error(
          tl('main.worker.catastrophicFailure', {
            code: code ?? 'null',
            signal: sign ?? 'null',
          }),
        );
        unregisterWorker(worker);
        workers.delete(worker);
      });
    } catch (error) {
      reject(error);
    }
  });
}
