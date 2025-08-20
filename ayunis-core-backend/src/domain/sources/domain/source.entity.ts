import { UUID, randomUUID } from 'crypto';
import { SourceType } from './source-type.enum';
import { SourceContent } from './source-content.entity';

export abstract class Source {
  id: UUID;
  type: SourceType;
  name: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  content: SourceContent[];

  constructor(params: {
    id?: UUID;
    type: SourceType;
    content: SourceContent[];
    name: string;
    text: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.type = params.type;
    this.content = params.content;
    this.name = params.name;
    this.text = params.text;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
