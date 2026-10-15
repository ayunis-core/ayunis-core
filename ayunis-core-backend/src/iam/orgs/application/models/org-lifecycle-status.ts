export const ORG_LIFECYCLE_STATUSES = [
  'archived',
  'paying',
  'expired',
  'trial',
  'no-plan',
] as const;

export type OrgLifecycleStatus = (typeof ORG_LIFECYCLE_STATUSES)[number];
