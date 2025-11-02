import type { IUpdateInstallerAPI } from 'bridge/UpdateInstallerAPI';
import { spawn } from 'child_process';
import { app } from 'electron';
import { provideAPI } from './IPC';
import { RendererIPCAPI } from './RendererIPCAPI';

export async function initUpdateInstallerAPI(): Promise<void> {
  provideAPI('UpdateInstallerAPI', {
    quitAndRun: async (executablePath: string, args: string[]) => {
      // prepare to quit the app
      // the renderer might be busy with a ton of IPCs
      // so we need to make sure that it can actually be closed
      await RendererIPCAPI.disconnect();

      // spawn the executable
      spawn(executablePath, args, {
        detached: true,
        stdio: 'ignore',
      }).unref();

      // quit the app
      app.quit();
    },
  } as IUpdateInstallerAPI);
}
