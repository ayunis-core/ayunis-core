import type { UUID } from 'crypto';
import type { DataSourceFileKind } from '../../../domain/data-source-file-kind.type';
import type { DataSourceProcessingTarget } from '../../ports/data-source-processing.port';

export class EnqueueDataSourceProcessingCommand {
  readonly uploadId: UUID;
  readonly orgId: UUID;
  readonly userId: UUID;
  readonly minioPath: string;
  readonly fileName: string;
  readonly kind: DataSourceFileKind;
  readonly targets: DataSourceProcessingTarget[];

  constructor(params: {
    uploadId: UUID;
    orgId: UUID;
    userId: UUID;
    minioPath: string;
    fileName: string;
    kind: DataSourceFileKind;
    targets: DataSourceProcessingTarget[];
  }) {
    this.uploadId = params.uploadId;
    this.orgId = params.orgId;
    this.userId = params.userId;
    this.minioPath = params.minioPath;
    this.fileName = params.fileName;
    this.kind = params.kind;
    this.targets = params.targets;
  }
}
