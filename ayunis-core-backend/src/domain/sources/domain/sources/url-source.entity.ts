import { UUID } from 'crypto';
import { Source } from '../source.entity';
import { SourceType } from '../source-type.enum';
import { SourceContent } from '../source-content.entity';

export class UrlSource extends Source {
  url: string;

  constructor(params: {
    id?: UUID;
    url: string;
    content: SourceContent[];
    websiteTitle: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({
      id: params.id,
      type: SourceType.URL,
      content: params.content,
      name: params.websiteTitle,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    });
    this.url = params.url;
  }
}
