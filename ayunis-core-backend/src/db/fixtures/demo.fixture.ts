// Additive demo data for the seed:minimal "Usage Org". Run after seed:minimal —
// this seed enriches the existing org, it does not create it.
export const demoFixture = {
  targetOrgName: 'Usage Org',
  usageAdminEmail: 'admin@usage.local',
  usageModelName: 'eu.anthropic.claude-sonnet-4-6',
  defaultPassword: 'admin',

  // targetCredits = credits this user should have consumed this month.
  users: [
    { email: 'anna@usage.local', name: 'Anna Schmidt', targetCredits: 1800 },
    { email: 'ben@usage.local', name: 'Ben Müller', targetCredits: 300 },
    { email: 'carla@usage.local', name: 'Carla Rossi', targetCredits: 250 },
    { email: 'dan@usage.local', name: 'Dan Becker', targetCredits: 1200 },
  ],

  teams: ['Marketing', 'Engineering', 'Project-X'],

  // Anna is in two teams on purpose, to demo most-restrictive-wins.
  memberships: {
    Marketing: ['anna@usage.local', 'ben@usage.local'],
    Engineering: ['carla@usage.local', 'admin@usage.local'],
    'Project-X': ['anna@usage.local', 'dan@usage.local'],
  },
} as const;
