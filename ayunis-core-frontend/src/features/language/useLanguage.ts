import { useState, useEffect } from "react";
import { useTranslation } from "node_modules/react-i18next";

export type Language = "en" | "de";

const languages = {
  en: "English",
  de: "Deutsch",
} as const;

export function useLanguage() {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<Language>("en");

  // Sync with react-i18next language
  useEffect(() => {
    const currentLang = i18n.language as Language;
    if (currentLang && currentLang in languages) {
      setLanguageState(currentLang);
    }

    // Listen for language changes
    const handleLanguageChange = (lng: string) => {
      if (lng in languages) {
        setLanguageState(lng as Language);
      }
    };

    i18n.on("languageChanged", handleLanguageChange);

    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, [i18n]);

  const setLanguage = async (newLanguage: Language) => {
    await i18n.changeLanguage(newLanguage);
    setLanguageState(newLanguage);
  };

  const getLanguageLabel = (lang: Language) => languages[lang];

  const availableLanguages = Object.entries(languages).map(([code, label]) => ({
    code: code as Language,
    label,
  }));

  return {
    language,
    setLanguage,
    getLanguageLabel,
    availableLanguages,
  };
}
