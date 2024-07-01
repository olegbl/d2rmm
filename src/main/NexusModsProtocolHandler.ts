import { app, dialog } from 'electron';
import path from 'path';
import { URL } from 'url';
import { EventAPI } from './EventAPI';

export async function initNexusModsProtocolHandler(): Promise<void> {
  const isDefaultNxmHandler = app.isDefaultProtocolClient('nxm');

  if (!isDefaultNxmHandler) {
    // TODO: move this to a nice place in the settings UI
    //       and remember if user selected "no"
    const choice = dialog.showMessageBoxSync({
      type: 'question',
      buttons: ['Yes', 'No'],
      title: 'Set as Default Handler',
      message:
        'Would you like to set D2RMM as the default handler for nxm:// links?',
    });

    if (choice === 0) {
      if (process.defaultApp) {
        if (process.argv.length > 1) {
          app.setAsDefaultProtocolClient('nxm', process.execPath, [
            process.argv[1],
            path.resolve(path.join('node_modules', process.argv[2])),
            path.resolve(process.argv[3]),
          ]);
        }
      } else {
        app.setAsDefaultProtocolClient('nxm');
      }
    }
  }

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
