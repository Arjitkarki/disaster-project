import React, { createContext, useContext, useState } from 'react';
import { translations, Translations } from '../constants/translations';

export type Lang = 'en' | 'ne';

interface LanguageContextValue {
  lang: Lang;
  t: Translations;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  t: translations.en,
  toggleLanguage: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  const toggleLanguage = () => setLang(l => (l === 'en' ? 'ne' : 'en'));
  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
