import { app } from 'electron';
import fs from 'fs';
import i18next from 'i18next';
import path from 'path';
import deDE from '../locales/de-DE.json';
import enUS from '../locales/en-US.json';
import esES from '../locales/es-ES.json';
import esMX from '../locales/es-MX.json';
import frFR from '../locales/fr-FR.json';
import itIT from '../locales/it-IT.json';
import jaJP from '../locales/ja-JP.json';
import koKR from '../locales/ko-KR.json';
import plPL from '../locales/pl-PL.json';
import ptBR from '../locales/pt-BR.json';
import ruRU from '../locales/ru-RU.json';
import zhCN from '../locales/zh-CN.json';
import zhTW from '../locales/zh-TW.json';

export { isI18nConsoleArg } from '../shared/i18n';

export function getLocaleConfigPath(): string {
  return path.resolve(path.join(app.getPath('userData'), 'd2rmm-locale.json'));
}

/**
 * Read the saved locale from d2rmm-locale.json synchronously.
 * Returns null if the file doesn't exist or can't be parsed.
 */
function getSavedLocale(): string | null {
  try {
    const raw = fs.readFileSync(getLocaleConfigPath(), 'utf8');
    const parsed = JSON.parse(raw) as { locale?: unknown };
    return typeof parsed.locale === 'string' ? parsed.locale : null;
  } catch {
    return null;
  }
}

export function getInitialLocale(): string {
  return (
    // get locale saved to d2rmm-locale.json
    getSavedLocale() ??
    // fall back to default locale for system
    navigator.language ??
    // fall back to English
    'en-US'
  );
}

export async function initI18n(): Promise<void> {
  const locale = getInitialLocale();

  await i18next.init({
    lng: locale,
    fallbackLng: 'en-US',
    resources: {
      'en-US': { translation: enUS },
      'de-DE': { translation: deDE },
      'fr-FR': { translation: frFR },
      'es-ES': { translation: esES },
      'es-MX': { translation: esMX },
      'it-IT': { translation: itIT },
      'pl-PL': { translation: plPL },
      'pt-BR': { translation: ptBR },
      'ru-RU': { translation: ruRU },
      'ko-KR': { translation: koKR },
      'zh-TW': { translation: zhTW },
      'zh-CN': { translation: zhCN },
      'ja-JP': { translation: jaJP },
    },
    interpolation: { escapeValue: false },
  });
}
