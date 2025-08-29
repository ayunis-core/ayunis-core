import { UUID } from 'crypto';

export class UpdateAgentCommand {
  public readonly agentId: UUID;
  public readonly name: string;
  public readonly instructions: string;
  public readonly modelId: UUID;

  constructor(params: {
    agentId: UUID;
    name: string;
    instructions: string;
    modelId: UUID;
  }) {
    this.agentId = params.agentId;
    this.name = params.name;
    this.instructions = params.instructions;
    this.modelId = params.modelId;
  }
}
