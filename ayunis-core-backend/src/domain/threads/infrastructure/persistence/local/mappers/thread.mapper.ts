import { Injectable } from '@nestjs/common';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ThreadRecord } from '../schema/thread.record';
import { MessageMapper } from 'src/domain/messages/infrastructure/persistence/local/mappers/message.mapper';
import { SourceMapper } from 'src/domain/sources/infrastructure/persistence/local/mappers/source.mapper';
import { PermittedModelMapper } from 'src/domain/models/infrastructure/persistence/local-permitted-models/mappers/permitted-model.mapper';

@Injectable()
export class ThreadMapper {
  constructor(
    private readonly messageMapper: MessageMapper,
    private readonly sourceMapper: SourceMapper,
    private readonly permittedModelMapper: PermittedModelMapper,
  ) {}

  toEntity(thread: Thread): ThreadRecord {
    const threadEntity = new ThreadRecord();
    threadEntity.id = thread.id;
    threadEntity.userId = thread.userId;
    threadEntity.model = this.permittedModelMapper.toRecord(thread.model);
    threadEntity.title = thread.title;
    threadEntity.instruction = thread.instruction;
    threadEntity.isInternetSearchEnabled = thread.isInternetSearchEnabled;
    threadEntity.messages = thread.messages.map((message) =>
      this.messageMapper.toEntity(message),
    );
    threadEntity.sources =
      thread.sources?.map((source) => this.sourceMapper.toEntity(source)) || [];
    threadEntity.createdAt = thread.createdAt;
    threadEntity.updatedAt = thread.updatedAt;
    return threadEntity;
  }

  toDomain(threadEntity: ThreadRecord): Thread {
    return new Thread({
      id: threadEntity.id,
      userId: threadEntity.userId,
      model: this.permittedModelMapper.toDomain(threadEntity.model),
      title: threadEntity.title,
      instruction: threadEntity.instruction,
      isInternetSearchEnabled: threadEntity.isInternetSearchEnabled,
      messages:
        threadEntity.messages?.map((message) =>
          this.messageMapper.toDomain(message),
        ) || [],
      sources:
        threadEntity.sources?.map((source) =>
          this.sourceMapper.toDomain(source),
        ) || [],
      createdAt: threadEntity.createdAt,
      updatedAt: threadEntity.updatedAt,
    });
  }
}
