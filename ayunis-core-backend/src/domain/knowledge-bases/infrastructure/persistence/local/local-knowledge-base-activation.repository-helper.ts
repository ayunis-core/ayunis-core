import { randomUUID, type UUID } from 'crypto';
import type { Repository } from 'typeorm';
import { KnowledgeBaseActivationRecord } from './schema/knowledge-base-activation.record';

export async function insertActivation(
  repository: Repository<KnowledgeBaseActivationRecord>,
  activation: {
    knowledgeBaseId: UUID;
    userId: UUID | null;
    workspaceId: UUID | null;
  },
): Promise<void> {
  await repository
    .createQueryBuilder()
    .insert()
    .into(KnowledgeBaseActivationRecord)
    .values({ id: randomUUID(), ...activation })
    .orIgnore()
    .execute();
}
