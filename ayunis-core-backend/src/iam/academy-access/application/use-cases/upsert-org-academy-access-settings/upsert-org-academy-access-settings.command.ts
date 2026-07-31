import type { UUID } from 'crypto';
import type { AcademyAccessMode } from '../../../domain/value-objects/academy-access-mode.enum';

export class UpsertOrgAcademyAccessSettingsCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly mode: AcademyAccessMode,
  ) {}
}
