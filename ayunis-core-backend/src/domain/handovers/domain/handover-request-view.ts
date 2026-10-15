import type { HandoverRequest } from './handover-request.entity';

export interface HandoverRequestView {
  request: HandoverRequest;
  resourceName: string;
  requesterName: string;
  targetTeamName: string | null;
}
