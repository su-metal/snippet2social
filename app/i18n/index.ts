import { en } from './locales/en';
import { ja } from './locales/ja';

export const TRANSLATIONS = { en, ja } as const;

export type TranslationKey = keyof typeof en;
export type LocaleCode = keyof typeof TRANSLATIONS;

export const translate = (locale: LocaleCode, key: TranslationKey): string => {
  const localized = TRANSLATIONS[locale]?.[key];
  if (localized) return localized;
  return TRANSLATIONS.en[key] ?? key;
};
