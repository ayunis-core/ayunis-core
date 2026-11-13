import type {
  ResourceOwner,
  TransferableResourceOwner,
} from 'src/domain/ownership/application/models/resource-owner';

export type KnowledgeBaseOwner = ResourceOwner;

/** The scopes a knowledge-base list can be requested for. */
export type KnowledgeBaseListScope = Extract<
  KnowledgeBaseOwner,
  { type: 'personal' | 'workspace' }
>;

export type KnowledgeBaseTransferOwner = TransferableResourceOwner;
