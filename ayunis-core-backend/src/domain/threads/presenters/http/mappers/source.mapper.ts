import { Injectable } from '@nestjs/common';
import { Source } from 'src/domain/sources/domain/source.entity';
import { FileSource } from 'src/domain/sources/domain/sources/file-source.entity';
import { UrlSource } from 'src/domain/sources/domain/sources/url-source.entity';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import {
  SourceResponseDto,
  FileSourceResponseDto,
  UrlSourceResponseDto,
} from '../dto/source-response.dto';

@Injectable()
export class SourceDtoMapper {
  toDto(
    source: Source,
  ): SourceResponseDto | FileSourceResponseDto | UrlSourceResponseDto {
    if (source instanceof FileSource) {
      return this.fileSourceToDto(source);
    } else if (source instanceof UrlSource) {
      return this.urlSourceToDto(source);
    }

    const baseDto = new SourceResponseDto();
    baseDto.id = source.id;
    baseDto.threadId = source.threadId;
    baseDto.userId = source.userId;
    baseDto.type = source.type;
    baseDto.createdAt = source.createdAt.toISOString();
    baseDto.updatedAt = source.updatedAt.toISOString();

    return baseDto;
  }

  private fileSourceToDto(source: FileSource): FileSourceResponseDto {
    const fileDto = new FileSourceResponseDto();
    fileDto.id = source.id;
    fileDto.threadId = source.threadId;
    fileDto.userId = source.userId;
    fileDto.type = SourceType.FILE;
    fileDto.fileType = source.fileType;
    fileDto.fileSize = source.fileSize;
    fileDto.createdAt = source.createdAt.toISOString();
    fileDto.updatedAt = source.updatedAt.toISOString();

    return fileDto;
  }

  private urlSourceToDto(source: UrlSource): UrlSourceResponseDto {
    const urlDto = new UrlSourceResponseDto();
    urlDto.id = source.id;
    urlDto.threadId = source.threadId;
    urlDto.userId = source.userId;
    urlDto.type = SourceType.URL;
    urlDto.url = source.url;
    urlDto.createdAt = source.createdAt.toISOString();
    urlDto.updatedAt = source.updatedAt.toISOString();

    return urlDto;
  }
}
