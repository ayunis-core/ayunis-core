import { UUID } from 'crypto';
import { Source } from '../source.entity';
import { SourceType } from '../source-type.enum';
import { SourceContent } from '../source-content.entity';

export class UrlSource extends Source {
  url: string;

  constructor(params: {
    id?: UUID;
    threadId?: UUID;
    userId: UUID;
    url: string;
    content: SourceContent[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({
      id: params.id,
      threadId: params.threadId,
      userId: params.userId,
      type: SourceType.URL,
      content: params.content,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    });
    this.url = params.url;
  }
}
