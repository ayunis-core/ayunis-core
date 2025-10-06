import { UUID, randomUUID } from 'crypto';
import { SourceType } from './source-type.enum';

export abstract class Source {
  id: UUID;
  type: SourceType;
  name: string;
  createdByLLM: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    type: SourceType;
    name: string;
    createdByLLM?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.type = params.type;
    this.name = params.name;
    this.createdByLLM = params.createdByLLM ?? false;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
