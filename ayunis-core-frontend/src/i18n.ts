import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files directly
import enAuth from './shared/locales/en/auth.json';
import deAuth from './shared/locales/de/auth.json';
import enCommon from './shared/locales/en/common.json';
import deCommon from './shared/locales/de/common.json';
import enAdminSettingsLayout from './shared/locales/en/admin-settings-layout.json';
import deAdminSettingsLayout from './shared/locales/de/admin-settings-layout.json';
import enAdminSettingsModels from './shared/locales/en/admin-settings-models.json';
import deAdminSettingsModels from './shared/locales/de/admin-settings-models.json';
import enAdminSettingsUsers from './shared/locales/en/admin-settings-users.json';
import deAdminSettingsUsers from './shared/locales/de/admin-settings-users.json';
import enAdminSettingsIntegrations from './shared/locales/en/admin-settings-integrations.json';
import deAdminSettingsIntegrations from './shared/locales/de/admin-settings-integrations.json';
import enAdminSettingsUsage from './shared/locales/en/admin-settings-usage.json';
import deAdminSettingsUsage from './shared/locales/de/admin-settings-usage.json';
import enAdminSettingsTeams from './shared/locales/en/admin-settings-teams.json';
import deAdminSettingsTeams from './shared/locales/de/admin-settings-teams.json';
import enAdminSettingsCreditLimits from './shared/locales/en/admin-settings-credit-limits.json';
import deAdminSettingsCreditLimits from './shared/locales/de/admin-settings-credit-limits.json';
import enSuperAdminSettingsLayout from './shared/locales/en/super-admin-settings-layout.json';
import deSuperAdminSettingsLayout from './shared/locales/de/super-admin-settings-layout.json';
import enSuperAdminSettingsOrgs from './shared/locales/en/super-admin-settings-orgs.json';
import deSuperAdminSettingsOrgs from './shared/locales/de/super-admin-settings-orgs.json';
import enSuperAdminSettingsOrg from './shared/locales/en/super-admin-settings-org.json';
import deSuperAdminSettingsOrg from './shared/locales/de/super-admin-settings-org.json';
import enSettings from './shared/locales/en/settings.json';
import deSettings from './shared/locales/de/settings.json';
import enChat from './shared/locales/en/chat.json';
import deChat from './shared/locales/de/chat.json';
import enChats from './shared/locales/en/chats.json';
import deChats from './shared/locales/de/chats.json';
import enInstall from './shared/locales/en/install.json';
import deInstall from './shared/locales/de/install.json';
import enInstallIntegration from './shared/locales/en/install-integration.json';
import deInstallIntegration from './shared/locales/de/install-integration.json';
import enSkills from './shared/locales/en/skills.json';
import deSkills from './shared/locales/de/skills.json';
import enSkill from './shared/locales/en/skill.json';
import deSkill from './shared/locales/de/skill.json';
import enKnowledgeBases from './shared/locales/en/knowledge-bases.json';
import deKnowledgeBases from './shared/locales/de/knowledge-bases.json';
import enSuperAdminSettingsSkills from './shared/locales/en/super-admin-settings-skills.json';
import deSuperAdminSettingsSkills from './shared/locales/de/super-admin-settings-skills.json';
import enSuperAdminSettingsSuperAdmins from './shared/locales/en/super-admin-settings-super-admins.json';
import deSuperAdminSettingsSuperAdmins from './shared/locales/de/super-admin-settings-super-admins.json';
import enSuperAdminSettingsAcademy from './shared/locales/en/super-admin-settings-academy.json';
import deSuperAdminSettingsAcademy from './shared/locales/de/super-admin-settings-academy.json';
import enAcademy from './shared/locales/en/academy.json';
import deAcademy from './shared/locales/de/academy.json';
import enArtifacts from './shared/locales/en/artifacts.json';
import deArtifacts from './shared/locales/de/artifacts.json';
import enSuperAdminSettingsPlatformConfig from './shared/locales/en/super-admin-settings-platform-config.json';
import deSuperAdminSettingsPlatformConfig from './shared/locales/de/super-admin-settings-platform-config.json';
import enAdminSettingsSecurity from './shared/locales/en/admin-settings-security.json';
import deAdminSettingsSecurity from './shared/locales/de/admin-settings-security.json';
import enAdminSettingsAnonymization from './shared/locales/en/admin-settings-anonymization.json';
import deAdminSettingsAnonymization from './shared/locales/de/admin-settings-anonymization.json';
import enAdminSettingsRetention from './shared/locales/en/admin-settings-retention.json';
import deAdminSettingsRetention from './shared/locales/de/admin-settings-retention.json';
import enAdminSettingsLetterheads from './shared/locales/en/admin-settings-letterheads.json';
import deAdminSettingsLetterheads from './shared/locales/de/admin-settings-letterheads.json';
import enAdminSettingsApiKeys from './shared/locales/en/admin-settings-api-keys.json';
import deAdminSettingsApiKeys from './shared/locales/de/admin-settings-api-keys.json';
import enMcpUserConfig from './shared/locales/en/mcp-user-config.json';
import deMcpUserConfig from './shared/locales/de/mcp-user-config.json';
import enAdminSettingsInstructions from './shared/locales/en/admin-settings-instructions.json';
import deAdminSettingsInstructions from './shared/locales/de/admin-settings-instructions.json';

const resources = {
  en: {
    auth: enAuth,
    common: enCommon,
    'admin-settings-layout': enAdminSettingsLayout,
    'admin-settings-models': enAdminSettingsModels,
    'admin-settings-users': enAdminSettingsUsers,
    'admin-settings-integrations': enAdminSettingsIntegrations,
    'admin-settings-usage': enAdminSettingsUsage,
    'admin-settings-teams': enAdminSettingsTeams,
    'admin-settings-credit-limits': enAdminSettingsCreditLimits,
    'super-admin-settings-layout': enSuperAdminSettingsLayout,
    'super-admin-settings-orgs': enSuperAdminSettingsOrgs,
    'super-admin-settings-org': enSuperAdminSettingsOrg,
    settings: enSettings,
    chat: enChat,
    chats: enChats,
    install: enInstall,
    'install-integration': enInstallIntegration,
    skills: enSkills,
    skill: enSkill,
    'knowledge-bases': enKnowledgeBases,
    'super-admin-settings-skills': enSuperAdminSettingsSkills,
    'super-admin-settings-super-admins': enSuperAdminSettingsSuperAdmins,
    'super-admin-settings-academy': enSuperAdminSettingsAcademy,
    academy: enAcademy,
    artifacts: enArtifacts,
    'super-admin-settings-platform-config': enSuperAdminSettingsPlatformConfig,
    'admin-settings-security': enAdminSettingsSecurity,
    'admin-settings-anonymization': enAdminSettingsAnonymization,
    'admin-settings-retention': enAdminSettingsRetention,
    'admin-settings-letterheads': enAdminSettingsLetterheads,
    'admin-settings-api-keys': enAdminSettingsApiKeys,
    'mcp-user-config': enMcpUserConfig,
    'admin-settings-instructions': enAdminSettingsInstructions,
  },
  de: {
    auth: deAuth,
    common: deCommon,
    'admin-settings-layout': deAdminSettingsLayout,
    'admin-settings-models': deAdminSettingsModels,
    'admin-settings-users': deAdminSettingsUsers,
    'admin-settings-integrations': deAdminSettingsIntegrations,
    'admin-settings-usage': deAdminSettingsUsage,
    'admin-settings-teams': deAdminSettingsTeams,
    'admin-settings-credit-limits': deAdminSettingsCreditLimits,
    'super-admin-settings-layout': deSuperAdminSettingsLayout,
    'super-admin-settings-orgs': deSuperAdminSettingsOrgs,
    'super-admin-settings-org': deSuperAdminSettingsOrg,
    settings: deSettings,
    chat: deChat,
    chats: deChats,
    install: deInstall,
    'install-integration': deInstallIntegration,
    skills: deSkills,
    skill: deSkill,
    'knowledge-bases': deKnowledgeBases,
    'super-admin-settings-skills': deSuperAdminSettingsSkills,
    'super-admin-settings-super-admins': deSuperAdminSettingsSuperAdmins,
    'super-admin-settings-academy': deSuperAdminSettingsAcademy,
    academy: deAcademy,
    artifacts: deArtifacts,
    'super-admin-settings-platform-config': deSuperAdminSettingsPlatformConfig,
    'admin-settings-security': deAdminSettingsSecurity,
    'admin-settings-anonymization': deAdminSettingsAnonymization,
    'admin-settings-retention': deAdminSettingsRetention,
    'admin-settings-letterheads': deAdminSettingsLetterheads,
    'admin-settings-api-keys': deAdminSettingsApiKeys,
    'mcp-user-config': deMcpUserConfig,
    'admin-settings-instructions': deAdminSettingsInstructions,
  },
};

// Language detector options
// const detectionOptions = {
//   // order and from where user language should be detected
//   order: ["localStorage", "htmlTag", "path", "subdomain"],

//   // keys or params to lookup language from
//   lookupLocalStorage: "ayunis-language",

//   // cache user language on
//   caches: ["localStorage"],

//   // only detect languages that are defined in our resources
//   checkWhitelist: true,
// };

// Keep <html lang> in sync with the active locale. A mismatched lang
// (e.g. lang="en" on German content) triggers Chrome auto-translate,
// which rewrites DOM text nodes and corrupts streamed assistant messages.
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

void i18n
  // detect user language
  //.use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    resources,
    fallbackLng: 'de',
    supportedLngs: ['en', 'de'],

    //detection: detectionOptions,

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

export default i18n;
