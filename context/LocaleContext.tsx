'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translate, type TranslationKey as I18nTranslationKey, type LocaleCode } from '../app/i18n';

export type UiLocale = LocaleCode;
export type TranslationKey = I18nTranslationKey;

const DEFAULT_UI_LOCALE: UiLocale = 'en';
const LOCALE_STORAGE_KEY = 'app_lang';
const LANGUAGE_QUERY_PARAM = 'lang';
const VALID_LOCALES: UiLocale[] = ['ja', 'en'];

const isValidLocale = (value: string | null): value is UiLocale => {
  return VALID_LOCALES.includes(value as UiLocale);
};

const readQueryLocale = (): UiLocale | null => {
  if (typeof window === 'undefined') return null;

  const url = new URL(window.location.href);
  const query = url.searchParams.get(LANGUAGE_QUERY_PARAM);

  if (query === null) return null;
  if (isValidLocale(query)) return query;

  // Invalid value: remove it to avoid confusing URLs like ?lang=jp
  url.searchParams.delete(LANGUAGE_QUERY_PARAM);
  window.history.replaceState(null, '', url.toString());
  return null;
};

const readStorageLocale = (): UiLocale | null => {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isValidLocale(stored)) {
    return stored;
  }
  return null;
};

const readNavigatorLocale = (): UiLocale => {
  if (typeof navigator === 'undefined' || !navigator.language) {
    return DEFAULT_UI_LOCALE;
  }
  return navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en';
};

export const resolveUiLocale = (): UiLocale => {
  const queryLocale = readQueryLocale();
  if (queryLocale) return queryLocale;

  const storageLocale = readStorageLocale();
  if (storageLocale) return storageLocale;

  return readNavigatorLocale();
};

const persistLocale = (locale: UiLocale) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
};

const syncLocaleToUrl = (locale: UiLocale) => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const current = url.searchParams.get(LANGUAGE_QUERY_PARAM);
  if (current === locale) return;

  url.searchParams.set(LANGUAGE_QUERY_PARAM, locale);
  window.history.replaceState(null, '', url.toString());
};

interface LocaleContextValue {
  uiLocale: UiLocale;
  // options.syncUrl: when true, also writes ?lang=... to the URL. Default false to avoid dirty URLs on initial load.
  setUiLocale: (locale: UiLocale, options?: { syncUrl?: boolean }) => void;
  t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export const LocaleProvider = ({ children }: { children: React.ReactNode }) => {
  const [uiLocale, setUiLocaleState] = useState<UiLocale>(DEFAULT_UI_LOCALE);

  const setUiLocale = useCallback(
    (locale: UiLocale, options?: { syncUrl?: boolean }) => {
      setUiLocaleState(locale);
      persistLocale(locale);
      if (options?.syncUrl) {
        syncLocaleToUrl(locale);
      }
    },
    []
  );

  useEffect(() => {
    const resolved = resolveUiLocale();
    // Initial resolution should NOT auto-write ?lang=... to the URL.
    setUiLocale(resolved);
  }, [setUiLocale]);

  const value: LocaleContextValue = {
    uiLocale,
    setUiLocale,
    t: (key: TranslationKey) => translate(uiLocale, key),
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
