import { spawn } from 'child_process';
import { app } from 'electron';
import type { IRendererIPCAPI } from 'bridge/RendererIPCAPI';
import type { IUpdateInstallerAPI } from 'bridge/UpdateInstallerAPI';
import { consumeAPI, provideAPI } from './IPC';

const RendererIPCAPI = consumeAPI<IRendererIPCAPI>('RendererIPCAPI');

export async function initUpdateInstallerAPI(): Promise<void> {
  provideAPI('UpdateInstallerAPI', {
    quitAndRun: async (script: string) => {
      // prepare to quit the app
      // the renderer might be busy with a ton of IPCs
      // so we need to make sure that it can actually be closed
      await RendererIPCAPI.disconnect();

      // spawn the script
      const child = spawn('powershell.exe', ['-File', script], {
        shell: true,
        detached: true,
        stdio: 'ignore',
      });
      child.unref();

      // quit the app
      app.quit();
    },
  } as IUpdateInstallerAPI);
}
