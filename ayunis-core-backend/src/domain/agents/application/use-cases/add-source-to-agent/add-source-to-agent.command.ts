import { Agent } from '../../../domain/agent.entity';
import { Source } from '../../../../sources/domain/source.entity';

export class AddSourceToAgentCommand {
  constructor(
    public readonly agent: Agent,
    public readonly source: Source,
  ) {}
}