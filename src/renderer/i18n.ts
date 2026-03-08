import i18n from 'i18next';
import deDE from 'locales/de-DE.json';
import enUS from 'locales/en-US.json';
import esES from 'locales/es-ES.json';
import esMX from 'locales/es-MX.json';
import frFR from 'locales/fr-FR.json';
import itIT from 'locales/it-IT.json';
import jaJP from 'locales/ja-JP.json';
import koKR from 'locales/ko-KR.json';
import plPL from 'locales/pl-PL.json';
import ptBR from 'locales/pt-BR.json';
import ruRU from 'locales/ru-RU.json';
import zhCN from 'locales/zh-CN.json';
import zhTW from 'locales/zh-TW.json';
import { isI18nError } from 'shared/i18n-log';
import { initReactI18next } from 'react-i18next';

export const SUPPORTED_LOCALES = [
  'en-US',
  'de-DE',
  'fr-FR',
  'es-ES',
  'es-MX',
  'it-IT',
  'pl-PL',
  'pt-BR',
  'ru-RU',
  'ko-KR',
  'zh-TW',
  'zh-CN',
  'ja-JP',
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_DISPLAY_NAMES: Record<Locale, string> = {
  'en-US': 'English (US)',
  'de-DE': 'Deutsch',
  'fr-FR': 'Français',
  'es-ES': 'Español (España)',
  'es-MX': 'Español (México)',
  'it-IT': 'Italiano',
  'pl-PL': 'Polski',
  'pt-BR': 'Português (Brasil)',
  'ru-RU': 'Русский',
  'ko-KR': '한국어',
  'zh-TW': '繁體中文',
  'zh-CN': '简体中文',
  'ja-JP': '日本語',
};

/**
 * Maps an arbitrary locale string (e.g. from app.getLocale()) to the nearest
 * supported D2RMM locale, or 'en-US' as fallback.
 */
export function getNearestSupportedLocale(locale: string): Locale {
  // Exact match
  if (SUPPORTED_LOCALES.includes(locale as Locale)) {
    return locale as Locale;
  }
  // Language-only match (e.g. 'de' → 'de-DE', 'zh' → 'zh-CN')
  const lang = locale.split('-')[0].toLowerCase();
  const match = SUPPORTED_LOCALES.find((l) =>
    l.toLowerCase().startsWith(lang + '-'),
  );
  return match ?? 'en-US';
}

/**
 * Read the saved locale from localStorage, falling back to 'en-US'.
 * Called before React renders so we can't use useSavedState here.
 */
export function getSavedLocale(): Locale {
  try {
    const saved = localStorage.getItem('locale');
    if (saved != null && SUPPORTED_LOCALES.includes(saved as Locale)) {
      return saved as Locale;
    }
  } catch {
    // ignore
  }
  return 'en-US';
}

export async function initI18n(locale: Locale): Promise<void> {
  await i18n.use(initReactI18next).init({
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
    interpolation: {
      // React already escapes values, no need for i18next to do it
      escapeValue: false,
    },
  });
}

/**
 * Translate an error to a display string.
 * If the error carries i18n metadata (I18nError), uses i18next for translation.
 * Otherwise falls back to String(error).
 */
export function te(error: unknown): string {
  if (isI18nError(error)) {
    return i18n.t(error.i18nKey, error.i18nArgs ?? {});
  }
  return String(error);
}

export default i18n;
