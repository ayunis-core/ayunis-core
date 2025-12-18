import { Injectable } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { GetThreadsResponseDtoItem } from '../dto/get-threads-response-item.dto';
import { GetThreadsResponseDto } from '../dto/get-threads-response.dto';
import { Paginated } from 'src/common/pagination/paginated.entity';

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

  toPaginatedDto(paginated: Paginated<Thread>): GetThreadsResponseDto {
    return {
      data: paginated.data.map((thread) => this.toDto(thread)),
      pagination: {
        limit: paginated.limit,
        offset: paginated.offset,
        total: paginated.total,
      },
    };
  }
}
