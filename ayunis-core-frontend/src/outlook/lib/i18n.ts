import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import deOutlook from '@/shared/locales/de/outlook.json';
import enOutlook from '@/shared/locales/en/outlook.json';

/**
 * The add-in pages don't load the app's i18n setup with its many namespaces;
 * they follow Outlook's display language instead of the app's stored choice.
 */
export function createOutlookI18n(displayLanguage: string): i18n {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: outlookLanguage(displayLanguage),
    fallbackLng: 'de',
    defaultNS: 'outlook',
    resources: { de: { outlook: deOutlook }, en: { outlook: enOutlook } },
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  document.documentElement.lang = outlookLanguage(displayLanguage);
  return instance;
}

/** Switches to Outlook's display language once Office has reported it. */
export function applyOutlookLanguage(
  instance: i18n,
  displayLanguage: string,
): void {
  const lng = outlookLanguage(displayLanguage);
  document.documentElement.lang = lng;
  void instance.changeLanguage(lng);
}

function outlookLanguage(displayLanguage: string): 'de' | 'en' {
  return displayLanguage.toLowerCase().startsWith('de') ? 'de' : 'en';
}
