import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { isAllowedImageContentType } from 'src/common/util/content-type.util';
import {
  InvalidObjectNameError,
  StoragePermissionDeniedError,
  UnexpectedStorageError,
} from '../../storage.errors';
import { DownloadObjectUseCase } from '../download-object/download-object.use-case';
import { DownloadObjectCommand } from '../download-object/download-object.command';
import { GetObjectInfoUseCase } from '../get-object-info/get-object-info.use-case';
import { GetObjectInfoCommand } from '../get-object-info/get-object-info.command';
import { DownloadOrgObjectQuery } from './download-org-object.query';

export interface OrgObjectDownload {
  stream: NodeJS.ReadableStream;
  contentType: string;
  size: number;
  filename: string;
}

@Injectable()
export class DownloadOrgObjectUseCase {
  private readonly logger = new Logger(DownloadOrgObjectUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly getObjectInfoUseCase: GetObjectInfoUseCase,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedStorageError)
  async execute(query: DownloadOrgObjectQuery): Promise<OrgObjectDownload> {
    this.logger.log('Downloading org object', {
      objectName: query.objectName,
    });

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    const segments = this.assertOrgScopedName(query.objectName, orgId);

    const info = await this.getObjectInfoUseCase.execute(
      new GetObjectInfoCommand(query.objectName),
    );
    if (!info.contentType || !isAllowedImageContentType(info.contentType)) {
      throw new StoragePermissionDeniedError({
        operation: 'download',
        objectName: query.objectName,
      });
    }

    const stream = await this.downloadObjectUseCase.execute(
      new DownloadObjectCommand(query.objectName),
    );

    return {
      stream,
      contentType: info.contentType,
      size: info.size,
      filename: segments[segments.length - 1].replace(/[^\w.-]/g, '_'),
    };
  }

  private assertOrgScopedName(objectName: string, orgId: string): string[] {
    const segments = objectName.split('/');
    const isMalformed = segments.some(
      (segment) => segment === '' || segment === '.' || segment === '..',
    );
    if (isMalformed) {
      throw new InvalidObjectNameError({ objectName });
    }
    if (segments[0] !== orgId) {
      throw new StoragePermissionDeniedError({
        operation: 'download',
        objectName,
      });
    }
    return segments;
  }
}
