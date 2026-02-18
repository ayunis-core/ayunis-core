import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files directly
import enAuth from './shared/locales/en/auth.json';
import deAuth from './shared/locales/de/auth.json';
import enCommon from './shared/locales/en/common.json';
import deCommon from './shared/locales/de/common.json';
import enAdminSettingsLayout from './shared/locales/en/admin-settings-layout.json';
import deAdminSettingsLayout from './shared/locales/de/admin-settings-layout.json';
import enAdminSettingsBilling from './shared/locales/en/admin-settings-billing.json';
import deAdminSettingsBilling from './shared/locales/de/admin-settings-billing.json';
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
import enPrompts from './shared/locales/en/prompts.json';
import dePrompts from './shared/locales/de/prompts.json';
import enAgents from './shared/locales/en/agents.json';
import deAgents from './shared/locales/de/agents.json';
import enAgent from './shared/locales/en/agent.json';
import deAgent from './shared/locales/de/agent.json';
import enQuickActions from './shared/locales/en/quickActions.json';
import deQuickActions from './shared/locales/de/quickActions.json';
import enChats from './shared/locales/en/chats.json';
import deChats from './shared/locales/de/chats.json';
import enInstall from './shared/locales/en/install.json';
import deInstall from './shared/locales/de/install.json';
import enSkills from './shared/locales/en/skills.json';
import deSkills from './shared/locales/de/skills.json';
import enSkill from './shared/locales/en/skill.json';
import deSkill from './shared/locales/de/skill.json';
import enArtifacts from './shared/locales/en/artifacts.json';
import deArtifacts from './shared/locales/de/artifacts.json';

const resources = {
  en: {
    auth: enAuth,
    common: enCommon,
    'admin-settings-layout': enAdminSettingsLayout,
    'admin-settings-billing': enAdminSettingsBilling,
    'admin-settings-models': enAdminSettingsModels,
    'admin-settings-users': enAdminSettingsUsers,
    'admin-settings-integrations': enAdminSettingsIntegrations,
    'admin-settings-usage': enAdminSettingsUsage,
    'admin-settings-teams': enAdminSettingsTeams,
    'super-admin-settings-layout': enSuperAdminSettingsLayout,
    'super-admin-settings-orgs': enSuperAdminSettingsOrgs,
    'super-admin-settings-org': enSuperAdminSettingsOrg,
    settings: enSettings,
    chat: enChat,
    chats: enChats,
    prompts: enPrompts,
    agents: enAgents,
    agent: enAgent,
    quickActions: enQuickActions,
    install: enInstall,
    skills: enSkills,
    skill: enSkill,
    artifacts: enArtifacts,
  },
  de: {
    auth: deAuth,
    common: deCommon,
    'admin-settings-layout': deAdminSettingsLayout,
    'admin-settings-billing': deAdminSettingsBilling,
    'admin-settings-models': deAdminSettingsModels,
    'admin-settings-users': deAdminSettingsUsers,
    'admin-settings-integrations': deAdminSettingsIntegrations,
    'admin-settings-usage': deAdminSettingsUsage,
    'admin-settings-teams': deAdminSettingsTeams,
    'super-admin-settings-layout': deSuperAdminSettingsLayout,
    'super-admin-settings-orgs': deSuperAdminSettingsOrgs,
    'super-admin-settings-org': deSuperAdminSettingsOrg,
    settings: deSettings,
    chat: deChat,
    chats: deChats,
    prompts: dePrompts,
    agents: deAgents,
    agent: deAgent,
    quickActions: deQuickActions,
    install: deInstall,
    skills: deSkills,
    skill: deSkill,
    artifacts: deArtifacts,
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
