import { UploadObjectCommand } from 'src/domain/storage/application/use-cases/upload-object/upload-object.command';

/** An object no organisation owns, such as a release-note image. */
export class UploadSystemObjectCommand extends UploadObjectCommand {}
