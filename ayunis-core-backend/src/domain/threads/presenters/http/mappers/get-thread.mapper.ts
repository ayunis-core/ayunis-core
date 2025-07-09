import { Injectable } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { GetThreadResponseDto } from '../dto/get-thread-response.dto';
import { MessageDtoMapper } from './message.mapper';

@Injectable()
export class GetThreadDtoMapper {
  constructor(private readonly messageDtoMapper: MessageDtoMapper) {}

  toDto(thread: Thread): GetThreadResponseDto {
    return {
      id: thread.id,
      userId: thread.userId,
      permittedModelId: thread.model?.id,
      agentId: thread.agent?.id,
      title: thread.title,
      messages: this.messageDtoMapper.toDtoArray(thread.messages),
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
    };
  }

  toDtoArray(threads: Thread[]): GetThreadResponseDto[] {
    return threads.map((thread) => this.toDto(thread));
  }
}
