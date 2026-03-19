'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Lang, t } from '@/data/i18n';

type TextMap = Record<string, string>;

interface LangContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  text: TextMap;
}

const LangContext = createContext<LangContextType>({
  lang: 'en',
  setLang: () => {},
  text: t.en as unknown as TextMap,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  return (
    <LangContext.Provider value={{ lang, setLang, text: t[lang] as unknown as TextMap }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
