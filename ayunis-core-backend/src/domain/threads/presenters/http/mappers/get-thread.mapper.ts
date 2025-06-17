import { Injectable } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { GetThreadResponseDto } from '../dto/get-thread-response.dto';
import { MessageDtoMapper } from './message.mapper';

@Injectable()
export class GetThreadDtoMapper {
  constructor(private readonly messageDtoMapper: MessageDtoMapper) {}

  toDto(thread: Thread): GetThreadResponseDto {
    if (!thread.modelConfig) {
      throw new Error('Model config is required');
    }
    return {
      id: thread.id,
      userId: thread.userId,
      model: {
        id: thread.model.id,
        name: thread.model.model.name,
        provider: thread.model.model.provider,
        displayName: thread.modelConfig?.displayName,
        canStream: thread.modelConfig?.canStream,
        isReasoning: thread.modelConfig?.isReasoning,
      },
      title: thread.title,
      instruction: thread.instruction,
      isInternetSearchEnabled: thread.isInternetSearchEnabled,
      messages: this.messageDtoMapper.toDtoArray(thread.messages),
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
    };
  }

  toDtoArray(threads: Thread[]): GetThreadResponseDto[] {
    return threads.map((thread) => this.toDto(thread));
  }
}
