/**
 * Minimal fixture for development and E2E testing
 * Contains: 1 org, 1 admin user, 1 model, 1 subscription
 */
export const minimalFixture = {
  org: {
    name: 'Demo Org',
  },

  user: {
    email: 'admin@demo.local',
    password: 'admin', // Will be hashed by seed runner
    name: 'Admin',
    role: 'ADMIN' as const,
    emailVerified: true,
    hasAcceptedMarketing: true,
  },

  model: {
    name: 'gpt-4o-mini',
    displayName: 'GPT-4o mini',
    provider: 'openai' as const,
    canStream: true,
    isReasoning: false,
    isArchived: false,
    canUseTools: true,
    canVision: false,
    type: 'language' as const,
  },

  subscription: {
    noOfSeats: 5,
    pricePerSeat: 10,
    renewalCycle: 'monthly' as const,
    billingInfo: {
      companyName: 'Demo Company',
      street: 'Main Street',
      houseNumber: '123',
      postalCode: '12345',
      city: 'Demo City',
      country: 'Germany',
    },
  },
} as const;
