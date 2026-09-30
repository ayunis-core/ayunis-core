import type { UUID } from 'crypto';
import {
  Source,
  type SourceRunStateParams,
} from 'src/domain/sources/domain/source.entity';
import type { FileType } from 'src/domain/sources/domain/source-type.enum';
import {
  SourceType,
  TextType,
} from 'src/domain/sources/domain/source-type.enum';
import type { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import type { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import type { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';

export abstract class TextSource extends Source {
  textType: TextType;

  constructor(
    params: {
      id?: UUID;
      name: string;
      type: TextType;
      knowledgeBaseId?: UUID | null;
      status?: SourceStatus;
      processingError?: string | null;
      processingErrorCode?: SourceProcessingErrorCode | null;
      processingStartedAt?: Date | null;
      createdBy?: SourceCreator;
      createdAt?: Date;
      updatedAt?: Date;
    } & SourceRunStateParams,
  ) {
    super({ ...params, type: SourceType.TEXT });
    this.textType = params.type;
  }
}

export class FileSource extends TextSource {
  fileType: FileType;

  constructor(
    params: {
      id?: UUID;
      fileType: FileType;
      name: string;
      type: TextType;
      knowledgeBaseId?: UUID | null;
      status?: SourceStatus;
      processingError?: string | null;
      processingErrorCode?: SourceProcessingErrorCode | null;
      processingStartedAt?: Date | null;
      createdBy?: SourceCreator;
      createdAt?: Date;
      updatedAt?: Date;
    } & SourceRunStateParams,
  ) {
    super({ ...params, type: TextType.FILE });
    this.fileType = params.fileType;
  }
}

export class UrlSource extends TextSource {
  url: string;
  /** Link depth this source was crawled at (0 = root page only). */
  maxDepth: number;

  constructor(
    params: {
      id?: UUID;
      url: string;
      name: string;
      type: TextType;
      maxDepth?: number;
      knowledgeBaseId?: UUID | null;
      status?: SourceStatus;
      processingError?: string | null;
      processingErrorCode?: SourceProcessingErrorCode | null;
      processingStartedAt?: Date | null;
      createdBy?: SourceCreator;
      createdAt?: Date;
      updatedAt?: Date;
    } & SourceRunStateParams,
  ) {
    super({ ...params, type: TextType.WEB });
    this.url = params.url;
    this.maxDepth = params.maxDepth ?? 0;
  }
}
