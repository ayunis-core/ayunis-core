import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  applyOfficeAddinLanguage,
  resolveOfficeAddinLanguage,
} from '@ayunis/office-addin/language';
import deOutlook from '@/outlook/locales/de/outlook.json';
import enOutlook from '@/outlook/locales/en/outlook.json';

import deAcademy from '@/outlook/locales/de/academy.json';
import deCommon from '@/outlook/locales/de/common.json';
import deChat from '@/outlook/locales/de/chat.json';
import deChats from '@/outlook/locales/de/chats.json';
import enAcademy from '@/outlook/locales/en/academy.json';
import enCommon from '@/outlook/locales/en/common.json';
import enChat from '@/outlook/locales/en/chat.json';
import enChats from '@/outlook/locales/en/chats.json';

/**
 * The add-in pages don't load the app's i18n setup with its many namespaces;
 * they follow Outlook's display language instead of the app's stored choice.
 */
export function createOutlookI18n(displayLanguage: string): i18n {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: resolveOfficeAddinLanguage(displayLanguage),
    fallbackLng: 'de',
    defaultNS: 'outlook',
    resources: {
      de: {
        outlook: deOutlook,
        chat: deChat,
        chats: deChats,
        common: deCommon,
        academy: deAcademy,
      },
      en: {
        outlook: enOutlook,
        chat: enChat,
        chats: enChats,
        common: enCommon,
        academy: enAcademy,
      },
    },
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  document.documentElement.lang = resolveOfficeAddinLanguage(displayLanguage);
  return instance;
}

export const applyOutlookLanguage = applyOfficeAddinLanguage;
