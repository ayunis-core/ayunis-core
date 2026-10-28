import type { UUID } from 'crypto';
import {
  AbstractKnowledgeBase,
  type AbstractKnowledgeBaseParams,
} from './abstract-knowledge-base.entity';

export class WorkspaceKnowledgeBase extends AbstractKnowledgeBase {
  readonly workspaceId: UUID;

  constructor(params: AbstractKnowledgeBaseParams & { workspaceId: UUID }) {
    super(params);
    this.workspaceId = params.workspaceId;
  }
}
