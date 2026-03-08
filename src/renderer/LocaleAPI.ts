import type { ILocaleAPI } from 'bridge/LocaleAPI';
import { consumeAPI, provideAPI } from 'renderer/IPC';
import i18next from 'i18next';

function getLocale(): string {
  return i18next.resolvedLanguage ?? i18next.language;
}

async function setLocale(locale: string): Promise<void> {
  await i18next.changeLanguage(locale);
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
