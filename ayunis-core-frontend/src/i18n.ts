import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translation files directly
import enAuth from "./shared/locales/en/auth.json";
import deAuth from "./shared/locales/de/auth.json";
import enCommon from "./shared/locales/en/common.json";
import deCommon from "./shared/locales/de/common.json";
import enAdminSettingsLayout from "./shared/locales/en/admin-settings-layout.json";
import deAdminSettingsLayout from "./shared/locales/de/admin-settings-layout.json";
import enAdminSettingsBilling from "./shared/locales/en/admin-settings-billing.json";
import deAdminSettingsBilling from "./shared/locales/de/admin-settings-billing.json";
import enAdminSettingsModels from "./shared/locales/en/admin-settings-models.json";
import deAdminSettingsModels from "./shared/locales/de/admin-settings-models.json";
import enAdminSettingsUsers from "./shared/locales/en/admin-settings-users.json";
import deAdminSettingsUsers from "./shared/locales/de/admin-settings-users.json";
import enSettings from "./shared/locales/en/settings.json";
import deSettings from "./shared/locales/de/settings.json";
import enChats from "./shared/locales/en/chats.json";
import deChats from "./shared/locales/de/chats.json";
import enPrompts from "./shared/locales/en/prompts.json";
import dePrompts from "./shared/locales/de/prompts.json";
import enAgents from "./shared/locales/en/agents.json";
import deAgents from "./shared/locales/de/agents.json";

const resources = {
  en: {
    auth: enAuth,
    common: enCommon,
    "admin-settings-layout": enAdminSettingsLayout,
    "admin-settings-billing": enAdminSettingsBilling,
    "admin-settings-models": enAdminSettingsModels,
    "admin-settings-users": enAdminSettingsUsers,
    settings: enSettings,
    chats: enChats,
    prompts: enPrompts,
    agents: enAgents,
  },
  de: {
    auth: deAuth,
    common: deCommon,
    "admin-settings-layout": deAdminSettingsLayout,
    "admin-settings-billing": deAdminSettingsBilling,
    "admin-settings-models": deAdminSettingsModels,
    "admin-settings-users": deAdminSettingsUsers,
    settings: deSettings,
    chats: deChats,
    prompts: dePrompts,
    agents: deAgents,
  },
};

// Language detector options
const detectionOptions = {
  // order and from where user language should be detected
  order: ["localStorage", "htmlTag", "path", "subdomain"],

  // keys or params to lookup language from
  lookupLocalStorage: "ayunis-language",

  // cache user language on
  caches: ["localStorage"],

  // only detect languages that are defined in our resources
  checkWhitelist: true,
};

i18n
  // detect user language
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    resources,
    fallbackLng: "de",
    supportedLngs: ["en", "de"],
    debug: true,

    detection: detectionOptions,

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

export default i18n;
