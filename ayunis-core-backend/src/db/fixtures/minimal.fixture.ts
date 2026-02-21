import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';

/**
 * Minimal fixture for development and E2E testing
 * Contains: 1 org, 1 admin user, 1 language model, 1 embedding model, 1 subscription
 */
export const minimalFixture = {
  org: {
    name: 'Demo Org',
  },

  user: {
    email: 'admin@demo.local',
    password: 'admin', // Will be hashed by seed runner
    name: 'Admin',
    role: UserRole.ADMIN,
    systemRole: SystemRole.SUPER_ADMIN,
    emailVerified: true,
    hasAcceptedMarketing: true,
  },

  languageModel: {
    name: 'eu.anthropic.claude-sonnet-4-6',
    displayName: 'Claude Sonnet 4 (Bedrock)',
    provider: ModelProvider.BEDROCK,
    canStream: true,
    isReasoning: false,
    isArchived: false,
    canUseTools: true,
    canVision: true,
  },

  embeddingModel: {
    name: 'text-embedding-3-large',
    displayName: 'Text Embedding 3 Large',
    provider: ModelProvider.OPENAI,
    dimensions: EmbeddingDimensions.DIMENSION_1536,
  },

  subscription: {
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

  permittedModels: [
    {
      // Language model as default
      modelKey: 'languageModel',
      isDefault: true,
      anonymousOnly: false,
    },
    {
      // Embedding model (not default)
      modelKey: 'embeddingModel',
      isDefault: false,
      anonymousOnly: false,
    },
  ],
} as const;

export type ModelKey = keyof Pick<
  typeof minimalFixture,
  'languageModel' | 'embeddingModel'
>;
