import { Injectable } from '@nestjs/common';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ThreadRecord } from '../schema/thread.record';
import { MessageMapper } from 'src/domain/messages/infrastructure/persistence/local/mappers/message.mapper';
import { SourceMapper } from 'src/domain/sources/infrastructure/persistence/local/mappers/source.mapper';
import { PermittedModelMapper } from 'src/domain/models/infrastructure/persistence/local-permitted-models/mappers/permitted-model.mapper';
import { AgentMapper } from 'src/domain/agents/infrastructure/persistence/local/mappers/agent.mapper';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';

@Injectable()
export class ThreadMapper {
  constructor(
    private readonly messageMapper: MessageMapper,
    private readonly sourceMapper: SourceMapper,
    private readonly permittedModelMapper: PermittedModelMapper,
    private readonly agentMapper: AgentMapper,
  ) {}

  toRecord(thread: Thread): ThreadRecord {
    const record = new ThreadRecord();
    record.id = thread.id;
    record.userId = thread.userId;
    record.modelId = thread.model?.id;
    record.model = thread.model
      ? this.permittedModelMapper.toRecord(thread.model)
      : undefined;
    record.agentId = thread.agent?.id;
    record.agent = thread.agent
      ? this.agentMapper.toRecord(thread.agent)
      : undefined;
    record.title = thread.title;
    record.messages = thread.messages.map((message) =>
      this.messageMapper.toRecord(message),
    );
    record.sources =
      thread.sources?.map((source) => this.sourceMapper.toEntity(source)) || [];
    record.createdAt = thread.createdAt;
    record.updatedAt = thread.updatedAt;
    return record;
  }

  toDomain(threadEntity: ThreadRecord): Thread {
    return new Thread({
      id: threadEntity.id,
      userId: threadEntity.userId,
      model:
        threadEntity.modelId && threadEntity.model
          ? (this.permittedModelMapper.toDomain(
              threadEntity.model,
            ) as PermittedLanguageModel)
          : undefined,
      agent:
        threadEntity.agentId && threadEntity.agent
          ? this.agentMapper.toDomain(threadEntity.agent)
          : undefined,
      title: threadEntity.title,
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
