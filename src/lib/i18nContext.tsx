import { createContext, useContext, useState, type ReactNode } from 'react';
import { t, type Lang } from './i18n';

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'uz',
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('uz');
  return (
    <I18nContext.Provider value={{ lang, setLang, t: (key, params) => t(lang, key, params) }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
