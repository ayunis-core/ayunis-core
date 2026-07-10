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
      members: [],
      teams: [],
      memberships: {},
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
} as const satisfies SeedFixture;

export const LANGUAGE_MODEL_KEYS = [
  'languageModel',
  'anthropicLanguageModel',
  'azureLanguageModel',
  'openaiLanguageModel',
  'mistralLanguageModel',
  'geminiLanguageModel',
] as const;
