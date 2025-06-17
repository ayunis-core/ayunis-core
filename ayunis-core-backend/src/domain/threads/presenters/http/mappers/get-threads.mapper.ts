import { Injectable } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { GetThreadsResponseDtoItem } from '../dto/get-threads-response-item.dto';

@Injectable()
export class GetThreadsDtoMapper {
  toDto(thread: Thread): GetThreadsResponseDtoItem {
    return {
      id: thread.id,
      title: thread.title,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
    };
  }

  toDtoArray(threads: Thread[]): GetThreadsResponseDtoItem[] {
    return threads.map((thread) => this.toDto(thread));
  }
}
