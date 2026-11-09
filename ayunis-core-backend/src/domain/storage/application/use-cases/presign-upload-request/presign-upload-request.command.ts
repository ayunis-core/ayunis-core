import type { UploadRequest } from 'src/domain/storage/domain/multipart-upload.object';

export class PresignUploadRequestCommand {
  constructor(
    public readonly objectName: string,
    public readonly request: UploadRequest,
    public readonly expiresInSeconds: number,
    public readonly bucket?: string,
  ) {}
}
