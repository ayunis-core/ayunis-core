import type { UUID } from 'crypto';

export interface OparlBodySummary {
  id: UUID;
  systemId: UUID;
  oparlId: string;
  name: string | null;
  shortName: string | null;
  web: string | null;
}
