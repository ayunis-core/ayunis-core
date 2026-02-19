import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { Source } from 'src/domain/sources/domain/source.entity';

export class AgentSourceAssignment {
  public readonly id: UUID;
  public readonly source: Source;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    source: Source;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.source = params.source;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
