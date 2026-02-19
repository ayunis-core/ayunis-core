import type { UUID } from 'crypto';

export class DeleteUserDefaultModelsByModelIdCommand {
  constructor(public readonly permittedModelId: UUID) {}
}
