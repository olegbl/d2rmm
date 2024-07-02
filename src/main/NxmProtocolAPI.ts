import type { INxmProtocolAPI } from 'bridge/NxmProtocolAPI';
import { app } from 'electron';
import path from 'path';
import { URL } from 'url';
import { EventAPI } from './EventAPI';
import { provideAPI } from './IPC';

export async function initNxmProtocolAPI(): Promise<void> {
  let args: [string, string | undefined, string[] | undefined] = [
    'nxm',
    undefined,
    undefined,
  ];

  if (process.defaultApp && process.argv.length > 1) {
    args = [
      'nxm',
      process.execPath,
      [
        process.argv[1],
        path.resolve(path.join('node_modules', process.argv[2])),
        path.resolve(process.argv[3]),
      ],
    ];
  }

  provideAPI('NxmProtocolAPI', {
    getIsRegistered: async () => app.isDefaultProtocolClient(...args),
    register: async () => app.setAsDefaultProtocolClient(...args),
    unregister: async () => app.removeAsDefaultProtocolClient(...args),
  } as INxmProtocolAPI);

  function onOpenNxmUrl(url: string): boolean {
    if (url.startsWith('nxm://')) {
      const { host, pathname, searchParams } = new URL(url);
      const paths = pathname.split('/');
      const game = host;
      const nexusModID = paths[2];
      const nexusFileID = parseInt(paths[4], 10);
      const key = searchParams.get('key');
      const expires = searchParams.has('expires')
        ? parseInt(searchParams.get('expires') ?? '0', 10)
        : null;
      if (
        game === 'diablo2resurrected' &&
        nexusModID != null &&
        nexusFileID != null
      ) {
        EventAPI.send('nexus-mods-open-url', {
          nexusModID,
          nexusFileID,
          key,
          expires,
        })
          .then()
          .catch(console.error);
        return true;
      }
    }
    return false;
  }

  app.on('open-url', (event, url) => {
    if (onOpenNxmUrl(url)) {
      event.preventDefault();
    }
  });

  app.on('second-instance', (_event, commandLine, _workingDirectory) => {
    onOpenNxmUrl(commandLine[commandLine.length - 1] ?? '');
  });
}
