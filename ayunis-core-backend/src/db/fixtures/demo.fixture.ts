// Additive demo data layered on top of the "Usage Org" from seed:minimal.
// Run AFTER seed:minimal — this seed does NOT create the org itself; it enriches
// the existing usage org with extra users, teams, memberships, and usage so the
// credit-limits admin UI can be exercised (per-user, per-team, multi-team).
export const demoFixture = {
  // Must already exist (created by seed:minimal). The seed exits if it's absent.
  targetOrgName: 'Usage Org',
  // Existing usage admin from seed:minimal — reused as a team member.
  usageAdminEmail: 'admin@usage.local',
  // Language model (by name) used to attribute the seeded usage records.
  usageModelName: 'eu.anthropic.claude-sonnet-4-6',
  defaultPassword: 'admin',

  // targetCredits = roughly how many credits this user should have consumed
  // this month, so consumption-vs-limit and the badges are easy to demo.
  users: [
    { email: 'anna@usage.local', name: 'Anna Schmidt', targetCredits: 1800 },
    { email: 'ben@usage.local', name: 'Ben Müller', targetCredits: 300 },
    { email: 'carla@usage.local', name: 'Carla Rossi', targetCredits: 250 },
    { email: 'dan@usage.local', name: 'Dan Becker', targetCredits: 1200 },
  ],

  teams: ['Marketing', 'Engineering', 'Project-X'],

  // team name -> member emails. Anna is in two teams (Marketing + Project-X)
  // to demonstrate most-restrictive-wins across teams.
  memberships: {
    Marketing: ['anna@usage.local', 'ben@usage.local'],
    Engineering: ['carla@usage.local', 'admin@usage.local'],
    'Project-X': ['anna@usage.local', 'dan@usage.local'],
  },
} as const;
