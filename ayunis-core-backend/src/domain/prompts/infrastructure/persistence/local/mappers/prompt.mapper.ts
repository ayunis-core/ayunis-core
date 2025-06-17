import { Injectable } from '@nestjs/common';
import { Prompt } from '../../../../domain/prompt.entity';
import { PromptRecord } from '../schema/prompt.record';

@Injectable()
export class PromptMapper {
  toDomain(entity: PromptRecord): Prompt {
    return new Prompt({
      id: entity.id,
      title: entity.title,
      content: entity.content,
      userId: entity.userId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: Prompt): PromptRecord {
    const entity = new PromptRecord();
    entity.id = domain.id;
    entity.title = domain.title;
    entity.content = domain.content;
    entity.userId = domain.userId;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  toDomainArray(entities: PromptRecord[]): Prompt[] {
    return entities.map((entity) => this.toDomain(entity));
  }
}
