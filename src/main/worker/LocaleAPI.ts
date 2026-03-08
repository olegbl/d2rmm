import type { ILocaleAPI } from 'bridge/LocaleAPI';
import fs from 'fs';
import path from 'path';
import { getUserDataPath } from './AppInfoAPI';
import { provideAPI } from './IPC';
import { changeLocale } from './i18n';

let currentLocale = process.env.LOCALE ?? 'en-US';

function getLocaleConfigPath(): string {
  return path.join(getUserDataPath(), 'd2rmm-locale.json');
}

export function initLocaleAPI(): void {
  provideAPI('LocaleAPI', {
    setLocale: async (locale: string): Promise<void> => {
      currentLocale = locale;
      await changeLocale(locale);
      const configPath = getLocaleConfigPath();
      fs.writeFileSync(configPath, JSON.stringify({ locale }, null, 2), 'utf8');
    },
    getLocale: async (): Promise<string> => {
      return currentLocale;
    },
  } as ILocaleAPI);
}
