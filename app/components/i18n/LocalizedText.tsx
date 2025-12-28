'use client';

import { useLocale, type TranslationKey } from '../../../context/LocaleContext';

export const LocalizedText = ({ k }: { k: TranslationKey }) => {
  const { t } = useLocale();
  return <>{t(k)}</>;
};

export default LocalizedText;
