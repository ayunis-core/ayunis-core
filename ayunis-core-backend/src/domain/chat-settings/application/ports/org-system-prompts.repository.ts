import type { UUID } from 'crypto';
import type { OrgSystemPrompt } from '../../domain/org-system-prompt.entity';

export abstract class OrgSystemPromptsRepository {
  abstract findByOrgId(orgId: UUID): Promise<OrgSystemPrompt | null>;
  abstract upsert(orgSystemPrompt: OrgSystemPrompt): Promise<OrgSystemPrompt>;
  abstract deleteByOrgId(orgId: UUID): Promise<void>;
}
