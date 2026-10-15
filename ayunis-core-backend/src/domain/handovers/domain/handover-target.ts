import type { UUID } from 'crypto';

export type HandoverTarget = { type: 'team'; teamId: UUID } | { type: 'org' };
