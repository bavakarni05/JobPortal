import React, { createContext, useContext, useMemo, useState } from 'react';
import { translations } from './translations';

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
  locale: 'en-US'
});

const languageToLocale = {
  en: 'en-US',
  ta: 'ta-IN',
  hi: 'hi-IN',
  te: 'te-IN'
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('lang') || 'en');

  const value = useMemo(() => {
    const dict = translations[language] || translations.en;
    const t = (key) => (dict && dict[key]) || translations.en[key] || key;
    const locale = languageToLocale[language] || 'en-US';
    const setLang = (lang) => {
      setLanguage(lang);
      try { localStorage.setItem('lang', lang); } catch {}
    };
    return { language, setLanguage: setLang, t, locale };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
} 