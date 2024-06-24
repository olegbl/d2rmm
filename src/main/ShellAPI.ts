import { shell } from 'electron';
import { IShellAPI } from 'bridge/ShellAPI';
import { provideAPI } from './IPC';

export async function initShellAPI(): Promise<void> {
  provideAPI('ShellAPI', {
    openExternal: async (url) => {
      return shell.openExternal(url);
    },
  } as IShellAPI);
}
