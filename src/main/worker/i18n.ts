import i18n from 'i18next';
import deDE from '../../locales/de-DE.json';
import enUS from '../../locales/en-US.json';
import esES from '../../locales/es-ES.json';
import esMX from '../../locales/es-MX.json';
import frFR from '../../locales/fr-FR.json';
import itIT from '../../locales/it-IT.json';
import jaJP from '../../locales/ja-JP.json';
import koKR from '../../locales/ko-KR.json';
import plPL from '../../locales/pl-PL.json';
import ptBR from '../../locales/pt-BR.json';
import ruRU from '../../locales/ru-RU.json';
import zhCN from '../../locales/zh-CN.json';
import zhTW from '../../locales/zh-TW.json';

export async function initI18n(): Promise<void> {
  const locale =
    // get locale passed from main thread
    process.env.LOCALE ??
    // fall back to default locale for system
    navigator.language ??
    // fall back to English
    'en-US';

  await i18n.init({
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

export default i18n;
