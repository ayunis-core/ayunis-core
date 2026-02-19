import type { Source } from 'src/domain/sources/domain/source.entity';
import type { UUID } from 'crypto';

export class AddSourceToAgentCommand {
  public readonly agentId: UUID;
  public readonly source: Source;

  constructor(params: { agentId: UUID; source: Source }) {
    this.agentId = params.agentId;
    this.source = params.source;
  }
}
