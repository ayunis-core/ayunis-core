import { UUID } from 'crypto';
import { Thread } from '../../../domain/thread.entity';
import { Source } from '../../../../sources/domain/source.entity';

export class AddSourceCommand {
  constructor(
    public readonly thread: Thread,
    public readonly source: Source,
    public readonly originSkillId?: UUID,
  ) {}
}
