import type { UUID } from 'crypto';
import type { Thread } from '../../../domain/thread.entity';
import type { Source } from '../../../../sources/domain/source.entity';

export class AddSourceCommand {
  constructor(
    public readonly thread: Thread,
    public readonly source: Source,
    public readonly originSkillId?: UUID,
  ) {}
}
