import { UUID, randomUUID } from 'crypto';
import { Source } from 'src/domain/sources/domain/source.entity';

export class SourceAssignment {
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
