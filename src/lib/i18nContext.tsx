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

const LANG_KEY = 'app_lang';

function loadLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null;
    if (saved && (saved === 'uz' || saved === 'en' || saved === 'ru')) return saved;
  } catch {}
  return 'uz';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(loadLang);
  const setLangPersisted = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem(LANG_KEY, l); } catch {}
  };
  return (
    <I18nContext.Provider value={{ lang, setLang: setLangPersisted, t: (key, params) => t(lang, key, params) }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
