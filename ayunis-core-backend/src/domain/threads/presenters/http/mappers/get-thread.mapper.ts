import { Injectable } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { GetThreadResponseDto } from '../dto/get-thread-response.dto';
import { MessageDtoMapper } from './message.mapper';
import { SourceDtoMapper } from './source.mapper';
import { FindThreadResult } from '../../../application/use-cases/find-thread/find-thread.use-case';

@Injectable()
export class GetThreadDtoMapper {
  constructor(
    private readonly messageDtoMapper: MessageDtoMapper,
    private readonly sourceDtoMapper: SourceDtoMapper,
  ) {}

  toDto(result: FindThreadResult): GetThreadResponseDto {
    const { thread, isLongChat } = result;

    return {
      id: thread.id,
      userId: thread.userId,
      permittedModelId: thread.model?.id,
      agentId: thread.agentId,
      title: thread.title,
      sources:
        thread.sourceAssignments?.map((sourceAssignment) =>
          this.sourceDtoMapper.toDto(sourceAssignment.source),
        ) ?? [],
      messages: this.messageDtoMapper.toDtoArray(thread.messages),
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
      isAnonymous: thread.isAnonymous,
      isLongChat,
      knowledgeBases: [
        ...new Map(
          (thread.knowledgeBaseAssignments ?? []).map((a) => [
            a.knowledgeBase.id,
            { id: a.knowledgeBase.id, name: a.knowledgeBase.name },
          ]),
        ).values(),
      ],
    };
  }

  toDtoArray(threads: Thread[]): GetThreadResponseDto[] {
    return threads.map((thread) => this.toDto({ thread, isLongChat: false }));
  }
}
