import { ScopeType } from '../../../domain/value-objects/scope-type.enum';

export class UploadFileCommand {
  constructor(
    public readonly file: Express.Multer.File,
    public readonly scopeType: ScopeType,
    public readonly scopeId?: string,
  ) {}
}
