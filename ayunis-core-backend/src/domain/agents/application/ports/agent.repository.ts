import { UUID } from 'crypto';
import { Agent } from '../../domain/agent.entity';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';

export abstract class AgentRepository {
  abstract create(agent: Agent): Promise<Agent>;
  abstract delete(agentId: UUID, userId: UUID): Promise<void>;
  abstract findOne(id: UUID, userId: UUID): Promise<Agent | null>;
  abstract findMany(ids: UUID[], userId: UUID): Promise<Agent[]>;
  abstract findAllByOwner(userId: UUID): Promise<Agent[]>;
  abstract findAllByModel(modelId: UUID): Promise<Agent[]>;
  abstract update(agent: Agent): Promise<Agent>;
  abstract updateModel(
    agentId: UUID,
    userId: UUID,
    model: PermittedLanguageModel,
  ): Promise<void>;
}
