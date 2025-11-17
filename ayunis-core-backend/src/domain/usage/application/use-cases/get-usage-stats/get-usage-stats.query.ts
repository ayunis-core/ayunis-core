import { UUID } from 'crypto';

export class GetUsageStatsQuery {
  public readonly organizationId: UUID;
  public readonly startDate?: Date;
  public readonly endDate?: Date;

  constructor(params: {
    organizationId: UUID;
    startDate?: Date;
    endDate?: Date;
  }) {
    this.organizationId = params.organizationId;
    this.startDate = params.startDate;
    this.endDate = params.endDate;
  }
}
