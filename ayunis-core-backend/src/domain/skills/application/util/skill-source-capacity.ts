import type { UUID } from 'crypto';
import { SkillsConstants } from 'src/domain/skills/domain/skills.constants';
import { SkillSourceLimitExceededError } from '../skills.errors';

export function assertSkillHasSourceCapacity(sourceIds: UUID[]): void {
  if (sourceIds.length >= SkillsConstants.MAX_SOURCES) {
    throw new SkillSourceLimitExceededError(SkillsConstants.MAX_SOURCES);
  }
}
