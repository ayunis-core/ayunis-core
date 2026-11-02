import type { OrgPayload } from '@ayunis-core/connect-sdk/contracts';
import type { Org } from 'src/iam/orgs/domain/org.entity';
import { mapUserToWebhookPayload } from 'src/integrations/webhooks/domain/mappers/user-webhook-payload.mapper';

export function mapOrgToWebhookPayload(org: Org): OrgPayload {
  return {
    id: org.id,
    name: org.name,
    archived: org.archived,
    hideIndividualUsage: org.hideIndividualUsage,
    sessionVersion: org.sessionVersion,
    users: org.users.map(mapUserToWebhookPayload),
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}
