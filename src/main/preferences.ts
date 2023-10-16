import { app } from 'electron';
import { existsSync } from 'fs';
import path from 'path';

const APPLICATION_DIRECTORY = path.dirname(app.getPath('exe'));

const GLOBAL_USER_DATA_DIRECTORY = app.getPath('userData');
const LOCAL_USER_DATA_DIRECTORY = APPLICATION_DIRECTORY;

const GLOBAL_USER_DATA_FLAG = 'ENABLE_GLOBAL_PREFERENCES';
const LOCAL_USER_DATA_FLAG = 'ENABLE_LOCAL_PREFERENCES';

const STORAGE_DIRECTORY = 'Local Storage';

export function getIsUsingLocalUserDataDirectory(): boolean {
  // explicit local preferences flag
  if (existsSync(path.join(APPLICATION_DIRECTORY, LOCAL_USER_DATA_FLAG))) {
    return true;
  }

  // explicit global preferences flag
  if (existsSync(path.join(APPLICATION_DIRECTORY, GLOBAL_USER_DATA_FLAG))) {
    return false;
  }

  // existing preferences in local directory
  if (existsSync(path.join(LOCAL_USER_DATA_DIRECTORY, STORAGE_DIRECTORY))) {
    return true;
  }

  // existing preferences in global directory
  if (existsSync(path.join(GLOBAL_USER_DATA_DIRECTORY, STORAGE_DIRECTORY))) {
    return false;
  }

  // default (local)
  return true;
}

export function initPreferences(): void {
  if (getIsUsingLocalUserDataDirectory()) {
    console.log('Using local preferences');
    app.setPath('userData', LOCAL_USER_DATA_DIRECTORY);
  } else {
    console.log('Using global preferences');
  }
}
