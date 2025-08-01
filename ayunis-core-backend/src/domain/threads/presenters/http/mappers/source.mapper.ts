import { Injectable } from '@nestjs/common';
import { Source } from 'src/domain/sources/domain/source.entity';
import { FileSource } from 'src/domain/sources/domain/sources/file-source.entity';
import { UrlSource } from 'src/domain/sources/domain/sources/url-source.entity';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import { UUID } from 'crypto';
import {
  SourceResponseDto,
  FileSourceResponseDto,
  UrlSourceResponseDto,
} from '../dto/get-thread-response.dto/source-response.dto';

@Injectable()
export class SourceDtoMapper {
  toDto(
    source: Source,
    threadId?: UUID,
  ): SourceResponseDto | FileSourceResponseDto | UrlSourceResponseDto {
    if (source instanceof FileSource) {
      return this.fileSourceToDto(source, threadId);
    } else if (source instanceof UrlSource) {
      return this.urlSourceToDto(source, threadId);
    }

    const baseDto = new SourceResponseDto();
    baseDto.id = source.id;
    baseDto.threadId = threadId;
    baseDto.type = source.type;
    baseDto.createdAt = source.createdAt.toISOString();
    baseDto.updatedAt = source.updatedAt.toISOString();

    return baseDto;
  }

  private fileSourceToDto(
    source: FileSource,
    threadId?: UUID,
  ): FileSourceResponseDto {
    const fileDto = new FileSourceResponseDto();
    fileDto.id = source.id;
    fileDto.threadId = threadId;
    fileDto.type = SourceType.FILE;
    fileDto.fileType = source.fileType;
    fileDto.fileSize = source.fileSize;
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
    urlDto.type = SourceType.URL;
    urlDto.url = source.url;
    urlDto.createdAt = source.createdAt.toISOString();
    urlDto.updatedAt = source.updatedAt.toISOString();

    return urlDto;
  }
}
