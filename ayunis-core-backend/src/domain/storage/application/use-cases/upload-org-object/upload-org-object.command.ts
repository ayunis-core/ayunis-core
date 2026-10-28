import type { UUID } from 'crypto';
import { UploadObjectCommand } from 'src/domain/storage/application/use-cases/upload-object/upload-object.command';

export class UploadOrgObjectCommand extends UploadObjectCommand {
  constructor(
    public readonly orgId: UUID,
    objectName: string,
    data: Buffer | NodeJS.ReadableStream,
    options?: Record<string, string | undefined>,
    bucket?: string,
  ) {
    super(objectName, data, options, bucket);
  }
}
