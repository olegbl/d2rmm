import { IShellAPI } from 'bridge/ShellAPI';
import { shell } from 'electron';
import { provideAPI } from './IPC';

export async function initShellAPI(): Promise<void> {
  provideAPI('ShellAPI', {
    openExternal: async (url) => {
      return shell.openExternal(url);
    },
    showItemInFolder: async (path) => {
      return shell.showItemInFolder(path);
    },
  } as IShellAPI);
}
