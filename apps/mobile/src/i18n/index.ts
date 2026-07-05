// i18n entry point. `useT()` returns a translator bound to the current language
// in settingsStore, so components re-render when the language changes.
import {useSettingsStore} from '../store/settingsStore';
import {translations, TranslationKey} from './translations';

export const useT = () => {
  const lang = useSettingsStore(s => s.language);
  return (key: TranslationKey): string =>
    translations[lang][key] ?? translations.es[key];
};

export {LANGUAGE_LIST, translations} from './translations';
export type {Language, TranslationKey, LanguageInfo} from './translations';
