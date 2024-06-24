import { fork } from 'child_process';
import { app } from 'electron';
import path from 'path';
import { registerWorker, unregisterWorker } from './IPC';

export async function spawnNewWorker(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const worker = !app.isPackaged
        ? fork('./src/main/worker/worker.ts', [], {
            execArgv: ['-r', 'ts-node/register/transpile-only'],
          })
        : fork(path.join(__dirname, 'worker.js'), [], {});

      worker.on('error', (error) => {
        console.error('Received error from worker:', error);
      });

      worker.on('spawn', () => {
        registerWorker(worker);
        resolve();
      });

      worker.on('exit', (code, sign) => {
        console.error(
          `Catastrophic failure! Worker exited with code ${code} (${sign}). You should restart D2RMM.`,
        );
        unregisterWorker(worker);
      });
    } catch (error) {
      reject(error);
    }
  });
}
