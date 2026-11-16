import type { UUID } from 'crypto';
export type McpConnectionFailure =
  'rejected' | 'forbidden' | 'timeout' | 'unavailable' | 'invalidResponse';

export interface McpConnectionObservation {
  integrationId: UUID;
  userId: UUID;
  revision: string;
  startedAt: Date;
  checkedAt: Date;
  failure: McpConnectionFailure | null;
}
