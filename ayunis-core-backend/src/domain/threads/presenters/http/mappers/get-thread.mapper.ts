import { Injectable } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { GetThreadResponseDto } from '../dto/get-thread-response.dto';
import { MessageDtoMapper } from './message.mapper';
import { SourceDtoMapper } from './source.mapper';
import { FindThreadResult } from '../../../application/use-cases/find-thread/find-thread.use-case';
import { PiiMaskDtoMapper } from 'src/domain/thread-pii-masks/presenters/http/mappers/pii-mask.mapper';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';

@Injectable()
export class GetThreadDtoMapper {
  constructor(
    private readonly messageDtoMapper: MessageDtoMapper,
    private readonly sourceDtoMapper: SourceDtoMapper,
    private readonly piiMaskDtoMapper: PiiMaskDtoMapper,
  ) {}

  toDto(
    result: FindThreadResult,
    piiMasks: ThreadPiiMask[] = [],
  ): GetThreadResponseDto {
    const { thread, isLongChat } = result;

    return {
      id: thread.id,
      userId: thread.userId,
      permittedModelId: thread.model?.id,
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
      knowledgeBases: thread.getUniqueKnowledgeBases(),
      piiMasks: this.piiMaskDtoMapper.toDtoArray(piiMasks),
    };
  }

  toDtoArray(threads: Thread[]): GetThreadResponseDto[] {
    return threads.map((thread) => this.toDto({ thread, isLongChat: false }));
  }
}
