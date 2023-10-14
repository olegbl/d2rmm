/* eslint-disable import/prefer-default-export */

import { app } from 'electron';
import { existsSync } from 'fs';
import path from 'path';

const APPLICATION_DIRECTORY = path.dirname(app.getPath('exe'));

const GLOBAL_USER_DATA_DIRECTORY = app.getPath('userData');
const LOCAL_USER_DATA_DIRECTORY = APPLICATION_DIRECTORY;

export function initPreferences(): void {
  // if the flag file doesn't exist, and there is data in %AppData%
  // then we will continue to store userData in %AppData% as not to
  // break existing configurations during an update
  if (
    !existsSync(path.join(APPLICATION_DIRECTORY, 'ENABLE_LOCAL_PREFERENCES')) &&
    existsSync(path.join(GLOBAL_USER_DATA_DIRECTORY, 'Local Storage'))
  ) {
    console.log('Using global preferences');
    return;
  }

  console.log('Using local preferences');
  app.setPath('userData', LOCAL_USER_DATA_DIRECTORY);
}
