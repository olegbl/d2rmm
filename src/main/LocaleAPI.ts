import type { ILocaleAPI } from 'bridge/LocaleAPI';
import { writeFileSync } from 'fs';
import i18next from 'i18next';
import { consumeAPI, provideAPI } from './IPC';
import { getLocaleConfigPath } from './i18n';

function getLocale(): string {
  return i18next.resolvedLanguage ?? i18next.language;
}

async function setLocale(locale: string): Promise<void> {
  await i18next.changeLanguage(locale);

  // write locale to d2rmm-locale.json
  const configPath = getLocaleConfigPath();
  writeFileSync(configPath, JSON.stringify({ locale }, null, 2), 'utf8');
}

export async function initLocaleAPI(): Promise<void> {
  provideAPI(
    'LocaleAPI',
    {
      getLocale,
      setLocale,
    } as ILocaleAPI,
    true,
  );
}

export const LocaleAPI = consumeAPI<ILocaleAPI, Pick<ILocaleAPI, 'getLocale'>>(
  'LocaleAPI',
  {
    // getLocale works locally
    getLocale,
  },
  true,
);
