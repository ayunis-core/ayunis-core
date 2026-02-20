import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { Source } from 'src/domain/sources/domain/source.entity';

export class SourceAssignment {
  public readonly id: UUID;
  public readonly source: Source;
  public readonly originSkillId?: UUID;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    source: Source;
    originSkillId?: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.source = params.source;
    this.originSkillId = params.originSkillId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
