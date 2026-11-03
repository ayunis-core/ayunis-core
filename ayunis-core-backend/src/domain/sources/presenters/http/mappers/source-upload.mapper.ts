import type { CreatedSourceUpload } from 'src/domain/sources/application/use-cases/create-source-upload-session/create-source-upload-session.use-case';
import type { SignedSourceUploadRequest } from 'src/domain/sources/application/use-cases/sign-source-upload-request/sign-source-upload-request.use-case';
import type { SignedUploadUrlResponseDto } from 'src/domain/sources/presenters/http/dto/signed-upload-url-response.dto';
import type { SourceUploadSessionResponseDto } from 'src/domain/sources/presenters/http/dto/source-upload-session-response.dto';

export function toSourceUploadSessionDto(
  created: CreatedSourceUpload,
): SourceUploadSessionResponseDto {
  return {
    id: created.session.id,
    multipart: created.session.multipart,
    partSizeBytes: created.partSizeBytes,
    expiresAt: created.session.expiresAt.toISOString(),
  };
}

export function toSignedUploadUrlDto(
  signed: SignedSourceUploadRequest,
): SignedUploadUrlResponseDto {
  return { url: signed.url, expiresAt: signed.expiresAt.toISOString() };
}
