import type { UUID } from 'crypto';
import type { DataSourceFileKind } from 'src/domain/sources/domain/data-source-file-kind.type';
import type { DataSourceProcessingTarget } from 'src/domain/sources/application/ports/data-source-processing.port';

export class EnqueueDataSourceProcessingCommand {
  readonly uploadId: UUID;
  readonly orgId: UUID;
  readonly userId: UUID;
  readonly minioPath: string;
  readonly fileName: string;
  readonly kind: DataSourceFileKind;
  readonly targets: DataSourceProcessingTarget[];
  readonly retainFile: boolean;
  readonly expectedSize?: number;
  readonly expectedETag?: string;

  constructor(params: {
    uploadId: UUID;
    orgId: UUID;
    userId: UUID;
    minioPath: string;
    fileName: string;
    kind: DataSourceFileKind;
    targets: DataSourceProcessingTarget[];
    retainFile?: boolean;
    expectedSize?: number;
    expectedETag?: string;
  }) {
    this.uploadId = params.uploadId;
    this.orgId = params.orgId;
    this.userId = params.userId;
    this.minioPath = params.minioPath;
    this.fileName = params.fileName;
    this.kind = params.kind;
    this.targets = params.targets;
    this.retainFile = params.retainFile ?? false;
    this.expectedSize = params.expectedSize;
    this.expectedETag = params.expectedETag;
  }
}
