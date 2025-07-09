import { UUID } from 'crypto';

export class ReplaceModelWithUserDefaultCommand {
  oldPermittedModelId?: UUID;
  oldAgentId?: UUID;
  constructor(params: { oldPermittedModelId?: UUID; oldAgentId?: UUID }) {
    this.oldPermittedModelId = params.oldPermittedModelId;
    this.oldAgentId = params.oldAgentId;
  }
}
