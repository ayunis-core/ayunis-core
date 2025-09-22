import { Injectable } from '@nestjs/common';
import { Source } from 'src/domain/sources/domain/source.entity';
import {
  FileSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import { UUID } from 'crypto';
import {
  FileSourceResponseDto,
  UrlSourceResponseDto,
} from '../dto/get-thread-response.dto/source-response.dto';

@Injectable()
export class SourceDtoMapper {
  toDto(
    source: Source,
    threadId?: UUID,
  ): FileSourceResponseDto | UrlSourceResponseDto {
    if (source instanceof FileSource) {
      return this.fileSourceToDto(source, threadId);
    } else if (source instanceof UrlSource) {
      return this.urlSourceToDto(source, threadId);
    }

    throw new Error('Invalid source type: ' + source.type);
  }

  private fileSourceToDto(
    source: FileSource,
    threadId?: UUID,
  ): FileSourceResponseDto {
    const fileDto = new FileSourceResponseDto();
    fileDto.id = source.id;
    fileDto.threadId = threadId;
    fileDto.type = SourceType.TEXT;
    fileDto.textType = source.textType;
    fileDto.fileType = source.fileType;
    fileDto.name = source.name;
    fileDto.createdAt = source.createdAt.toISOString();
    fileDto.updatedAt = source.updatedAt.toISOString();

    return fileDto;
  }

  private urlSourceToDto(
    source: UrlSource,
    threadId?: UUID,
  ): UrlSourceResponseDto {
    const urlDto = new UrlSourceResponseDto();
    urlDto.id = source.id;
    urlDto.threadId = threadId;
    urlDto.type = SourceType.TEXT;
    urlDto.textType = source.textType;
    urlDto.url = source.url;
    urlDto.name = source.name;
    urlDto.createdAt = source.createdAt.toISOString();
    urlDto.updatedAt = source.updatedAt.toISOString();

    return urlDto;
  }
}
