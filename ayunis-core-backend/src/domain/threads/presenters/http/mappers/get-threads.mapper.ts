import { Injectable } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import {
  GetThreadsResponseDtoItem,
  ThreadsListResponseDto,
} from '../dto/get-threads-response-item.dto';
import { Paginated } from 'src/common/pagination';

@Injectable()
export class GetThreadsDtoMapper {
  toDto(thread: Thread): GetThreadsResponseDtoItem {
    return {
      id: thread.id,
      title: thread.title,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
      isAnonymous: thread.isAnonymous,
    };
  }

  toDtoArray(threads: Thread[]): GetThreadsResponseDtoItem[] {
    return threads.map((thread) => this.toDto(thread));
  }

  toListDto(paginatedThreads: Paginated<Thread>): ThreadsListResponseDto {
    return {
      threads: paginatedThreads.data.map((thread) => this.toDto(thread)),
      pagination: {
        limit: paginatedThreads.limit,
        offset: paginatedThreads.offset,
        total: paginatedThreads.total,
      },
    };
  }
}
