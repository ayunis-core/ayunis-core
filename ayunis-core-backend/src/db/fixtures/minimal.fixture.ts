import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
/**
 * Minimal fixture for development and E2E testing
 * Contains: 2 orgs (seat-based + usage-based), admin users, models, subscriptions
 */
export const minimalFixture = {
  org: {
    name: 'Demo Org',
  },

  usageOrg: {
    name: 'Usage Org',
  },

  user: {
    email: 'admin@demo.local',
    password: 'admin', // eslint-disable-line sonarjs/no-hardcoded-passwords -- test fixture, not a real credential
    name: 'Admin',
    role: UserRole.ADMIN,
    systemRole: SystemRole.SUPER_ADMIN,
    emailVerified: true,
    hasAcceptedMarketing: true,
  },

  usageUser: {
    email: 'admin@usage.local',
    password: 'admin', // eslint-disable-line sonarjs/no-hardcoded-passwords -- test fixture, not a real credential
    name: 'Usage Admin',
    role: UserRole.ADMIN,
    systemRole: SystemRole.CUSTOMER,
    emailVerified: true,
    hasAcceptedMarketing: false,
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
    inputTokenCost: 3,
    outputTokenCost: 15,
  },

  embeddingModel: {
    name: 'mistral-embed',
    displayName: 'Mistral Embed',
    provider: ModelProvider.MISTRAL,
    dimensions: EmbeddingDimensions.DIMENSION_1024,
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

  usageSubscription: {
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

  platformConfig: {
    creditsPerEuro: 100,
  },

  permittedModels: [
    {
      // Language model as default
      modelKey: 'languageModel',
      isDefault: true,
      anonymousOnly: false,
    },
    {
      // Embedding model as default
      modelKey: 'embeddingModel',
      isDefault: true,
      anonymousOnly: false,
    },
  ],
} as const;

export type ModelKey = keyof Pick<
  typeof minimalFixture,
  'languageModel' | 'embeddingModel'
>;
