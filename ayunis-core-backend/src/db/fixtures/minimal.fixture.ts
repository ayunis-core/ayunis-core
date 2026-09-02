import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import type { SeedFixture } from './minimal-fixture.types';

export const minimalFixture = {
  languageModel: {
    name: 'eu.anthropic.claude-sonnet-4-6',
    displayName: 'Claude Sonnet 4 (Bedrock)',
    provider: ModelProvider.BEDROCK,
    canStream: true,
    isReasoning: false,
    isArchived: false,
    canUseTools: true,
    canVision: true,
    inputTokenCost: 3,
    outputTokenCost: 15,
  },

  anthropicLanguageModel: {
    name: 'claude-sonnet-4-5',
    displayName: 'Claude Sonnet 4.5 (Anthropic)',
    provider: ModelProvider.ANTHROPIC,
    canStream: true,
    isReasoning: false,
    isArchived: false,
    canUseTools: true,
    canVision: true,
    inputTokenCost: 3,
    outputTokenCost: 15,
  },

  azureLanguageModel: {
    name: 'gpt-5.4',
    displayName: 'GPT-5.4 (Azure)',
    provider: ModelProvider.AZURE,
    canStream: true,
    isReasoning: false,
    isArchived: false,
    canUseTools: true,
    canVision: true,
    inputTokenCost: 3,
    outputTokenCost: 15,
  },

  openaiLanguageModel: {
    name: 'gpt-4o',
    displayName: 'GPT-4o (OpenAI)',
    provider: ModelProvider.OPENAI,
    canStream: true,
    isReasoning: false,
    isArchived: false,
    canUseTools: true,
    canVision: true,
    inputTokenCost: 2.5,
    outputTokenCost: 10,
  },

  mistralLanguageModel: {
    name: 'mistral-large-latest',
    displayName: 'Mistral Large (Mistral)',
    provider: ModelProvider.MISTRAL,
    canStream: true,
    isReasoning: false,
    isArchived: false,
    canUseTools: true,
    canVision: false,
    inputTokenCost: 2,
    outputTokenCost: 6,
  },

  geminiLanguageModel: {
    name: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro (Gemini)',
    provider: ModelProvider.GEMINI,
    canStream: true,
    isReasoning: false,
    isArchived: false,
    canUseTools: true,
    canVision: true,
    inputTokenCost: 1.25,
    outputTokenCost: 10,
  },

  embeddingModel: {
    name: 'mistral-embed',
    displayName: 'Mistral Embed',
    provider: ModelProvider.MISTRAL,
    dimensions: EmbeddingDimensions.DIMENSION_1024,
  },

  imageGenerationModel: {
    name: 'gpt-image-1',
    displayName: 'GPT Image 1 (Azure)',
    provider: ModelProvider.AZURE,
    inputTokenCost: 5,
    outputTokenCost: 40,
  },

  platformConfig: {
    creditsPerEuro: 100,
  },

  orgs: [
    {
      key: 'demo',
      name: 'Demo Org',
      admin: {
        email: 'admin@demo.local',
        password: 'admin',
        name: 'Admin',
        role: UserRole.ADMIN,
        systemRole: SystemRole.SUPER_ADMIN,
        emailVerified: true,
        hasAcceptedMarketing: true,
      },
      subscription: {
        type: 'seat',
        noOfSeats: 5,
        pricePerSeat: 10,
        renewalCycle: RenewalCycle.MONTHLY,
        billingInfo: {
          companyName: 'Demo Company',
          street: 'Main Street',
          houseNumber: '123',
          postalCode: '12345',
          city: 'Demo City',
          country: 'Germany',
        },
      },
      members: [
        {
          email: 'shared-skill-viewer@demo.local',
          name: 'Shared Skill Viewer',
          consumedCredits: 0,
        },
      ],
      teams: [],
      memberships: {},
      skills: [
        {
          name: 'Bürgerfreundlich formulieren',
          shortDescription:
            'Schreibt Antworten klar, verbindlich und in einfacher Sprache.',
          instructions:
            'Formuliere immer bürgernah, vermeide Amtsdeutsch und schließe mit einem konkreten nächsten Schritt.',
        },
        {
          name: 'Einsatzlage strukturieren',
          shortDescription:
            'Ordnet Feuerwehr-Informationen nach Lage, Maßnahmen und offenen Punkten.',
          instructions:
            'Strukturiere Einsatzinformationen in Lage, Risiken, Maßnahmen, Zuständigkeiten und offene Rückfragen.',
        },
        {
          name: 'Geteiltes Bürgerwissen',
          shortDescription:
            'Stellt eine geteilte Wissensbasis für Organisationsmitglieder bereit.',
          instructions:
            'Nutze die verknüpfte Wissensbasis, wenn du Fragen zu Bürgerdiensten beantwortest.',
        },
      ],
      knowledgeBases: [
        {
          name: 'Bürgerbüro Wissensbasis',
          description:
            'Demo-Unterlagen zu Öffnungszeiten, Meldebescheinigung und Standardantworten.',
          documents: [
            {
              name: 'Bürgerbüro FAQ.txt',
              text: 'Das Bürgerbüro ist montags bis freitags von 08:00 bis 12:00 Uhr geöffnet. Für Meldebescheinigungen wird ein gültiger Ausweis benötigt. Termine können online oder telefonisch vereinbart werden.',
            },
          ],
        },
        {
          name: 'Feuerwehr Einsatzwissen',
          description:
            'Demo-Unterlagen zu Fahrzeugen, Alarmstufen und Einsatznotizen.',
          documents: [
            {
              name: 'Fahrzeugübersicht.txt',
              text: 'Die Feuerwehr verfügt über ein HLF 20, eine Drehleiter und einen Einsatzleitwagen. Bei Alarmstufe 2 wird zusätzlich die Nachbarwehr informiert.',
            },
          ],
        },
        {
          name: 'Geteiltes Bürgerwissen',
          description:
            'Manuelle Testdaten für den Zugriff auf eine Wissensbasis über einen geteilten Skill.',
          documents: [
            {
              name: 'Geteiltes Bürgerwissen FAQ.txt',
              text: 'Diese Wissensbasis ist über den Skill Geteiltes Bürgerwissen für andere Organisationsmitglieder lesbar.',
            },
          ],
        },
      ],
      sharedSkillKnowledgeBases: [
        {
          skillName: 'Geteiltes Bürgerwissen',
          knowledgeBaseName: 'Geteiltes Bürgerwissen',
        },
      ],
      // Iteration-1 workspaces (AYC-700): enough to fill the sidebar group,
      // both list views and the manual ordering without clicking anything.
      // Only visible while FEATURE_WORKSPACES_ENABLED is on.
      workspaces: [
        {
          name: 'Bürgeranfragen',
          description:
            'Anfragen von Bürgerinnen und Bürgern bündeln und beantworten',
          instruction:
            'Antworte im Namen der Stadtverwaltung. Sei freundlich, präzise und nenne benötigte Unterlagen ausdrücklich.',
          icon: 'usercheck',
          color: 'violet',
          skillNames: ['Bürgerfreundlich formulieren'],
          knowledgeBaseNames: ['Bürgerbüro Wissensbasis'],
          documents: [
            {
              name: 'Projektbriefing Bürgeranfragen.txt',
              text: 'Dieses Projekt bündelt Bürgeranfragen. Priorität haben verständliche Antworten, klare Zuständigkeiten und Hinweise auf digitale Services.',
            },
          ],
          pinned: true,
        },
        {
          name: 'Feuerwehr',
          description: 'Einsätze, Fahrzeuge und Ausrüstung',
          instruction:
            'Fasse einsatzbezogene Informationen sachlich zusammen und markiere unbestätigte Angaben deutlich.',
          icon: 'flame',
          color: 'rose',
          skillNames: ['Einsatzlage strukturieren'],
          knowledgeBaseNames: ['Feuerwehr Einsatzwissen'],
          documents: [
            {
              name: 'Projektbriefing Feuerwehr.txt',
              text: 'Dieses Projekt unterstützt bei Einsatznachbereitung, Materiallisten und Kommunikation mit Verwaltung und Leitstelle.',
            },
          ],
          pinned: true,
        },
        {
          name: 'Gebühren & Finanzen',
          instruction:
            'Erkläre Gebühren nachvollziehbar und weise auf mögliche Satzungsgrundlagen hin.',
          icon: 'euro',
          color: '#2c7a4b',
          skillNames: ['Bürgerfreundlich formulieren'],
          pinned: false,
        },
      ],
    },
    {
      key: 'usage',
      name: 'Usage Org',
      admin: {
        email: 'admin@usage.local',
        password: 'admin',
        name: 'Usage Admin',
        role: UserRole.ADMIN,
        systemRole: SystemRole.CUSTOMER,
        emailVerified: true,
        hasAcceptedMarketing: false,
      },
      subscription: {
        type: 'usage',
        monthlyCredits: 10000,
        billingInfo: {
          companyName: 'Usage Company',
          street: 'Credit Lane',
          houseNumber: '42',
          postalCode: '54321',
          city: 'Usage City',
          country: 'Germany',
        },
      },
      members: [
        {
          email: 'anna@usage.local',
          name: 'Anna Schmidt',
          consumedCredits: 1800,
          creditLimit: 2000,
        },
        {
          email: 'ben@usage.local',
          name: 'Ben Müller',
          consumedCredits: 300,
          creditLimit: 320,
        },
        {
          email: 'carla@usage.local',
          name: 'Carla Rossi',
          consumedCredits: 250,
        },
        {
          email: 'dan@usage.local',
          name: 'Dan Becker',
          consumedCredits: 1200,
          creditLimit: 1000,
        },
      ],
      teams: ['Marketing', 'Engineering', 'Project-X'],
      // Anna is in two teams (Marketing + Project-X), both with limits, plus her
      // own personal limit — so most-restrictive-wins is exercised across
      // personal and multiple team pools. With Marketing's shared pool at
      // 2100/2200 (100 left), Project-X at 3000/4000, and Anna personally at
      // 1800/2000, the Marketing team pool is the binding constraint for her.
      memberships: {
        Marketing: ['anna@usage.local', 'ben@usage.local'],
        Engineering: ['carla@usage.local'],
        'Project-X': ['anna@usage.local', 'dan@usage.local'],
      },
      teamLimits: {
        Marketing: 2200,
        Engineering: 5000,
        'Project-X': 4000,
      },
      // Only this org gets the add-on. Demo Org stays without it so the two
      // logins cover both the academy and the "org cannot take the
      // completion at all" paths.
      academyAddon: true,
      // The admin is left without a completion on purpose so the Academy
      // chapter-confirmation journey can be exercised live.
      academyCompletions: [
        {
          email: 'anna@usage.local',
          completedDaysAgo: 10,
          expectedState: 'valid',
        },
        {
          email: 'ben@usage.local',
          completedDaysAgo: 340,
          expectedState: 'expiring soon — 1-month pop-up',
        },
        {
          email: 'carla@usage.local',
          completedDaysAgo: 361,
          expectedState: 'expiring soon — final-week countdown banner',
        },
        {
          email: 'dan@usage.local',
          completedDaysAgo: 400,
          expectedState: 'expired — chat gated in annual mode',
        },
      ],
    },
  ],

  permittedModels: [
    {
      // Language model as default
      modelKey: 'languageModel',
      isDefault: true,
      anonymousOnly: false,
    },
    {
      modelKey: 'anthropicLanguageModel',
      isDefault: false,
      anonymousOnly: false,
    },
    {
      modelKey: 'azureLanguageModel',
      isDefault: false,
      anonymousOnly: false,
    },
    {
      modelKey: 'openaiLanguageModel',
      isDefault: false,
      anonymousOnly: false,
    },
    {
      modelKey: 'mistralLanguageModel',
      isDefault: false,
      anonymousOnly: false,
    },
    {
      modelKey: 'geminiLanguageModel',
      isDefault: false,
      anonymousOnly: false,
    },
    {
      // Embedding model as default
      modelKey: 'embeddingModel',
      isDefault: true,
      anonymousOnly: false,
    },
    {
      // Image-generation model (always single-per-org, default-by-construction)
      modelKey: 'imageGenerationModel',
      isDefault: true,
      anonymousOnly: false,
    },
  ],

  // Academy content is platform-wide, not per-org. Two chapters keep the
  // completion journey short while still proving that every chapter must be
  // confirmed before Core unlocks.
  academyChapters: [
    {
      title: 'KI-Grundlagen',
      description:
        'Wie große Sprachmodelle arbeiten, wo ihre Grenzen liegen und was das für die Verwaltungsarbeit bedeutet.',
      position: 1,
      modules: [
        {
          title: 'Was ein Sprachmodell tut',
          description:
            'Eine kurze Einführung in Tokens, Kontext und Wahrscheinlichkeiten.',
          loomUrl:
            'https://www.loom.com/share/1e8d673f95e64c989f60a6885891777d',
          position: 1,
        },
      ],
    },
    {
      title: 'Verantwortungsvoller Einsatz',
      description:
        'Wie KI-Ergebnisse geprüft und personenbezogene Daten geschützt werden.',
      position: 2,
      modules: [
        {
          title: 'Verantwortung bleibt beim Menschen',
          description:
            'KI-Ausgaben kritisch prüfen und nur geeignete Daten verwenden.',
          loomUrl:
            'https://www.loom.com/share/1e8d673f95e64c989f60a6885891777d',
          position: 1,
        },
      ],
    },
  ],
} as const satisfies SeedFixture;

export const LANGUAGE_MODEL_KEYS = [
  'languageModel',
  'anthropicLanguageModel',
  'azureLanguageModel',
  'openaiLanguageModel',
  'mistralLanguageModel',
  'geminiLanguageModel',
] as const;
