import type { OrgPayload } from '@ayunis-core/connect-sdk/contracts';
import { mapOrgToWebhookPayload } from 'src/integrations/webhooks/domain/mappers/org-webhook-payload.mapper';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';
import type { Org } from 'src/iam/orgs/domain/org.entity';

export class OrgCreatedWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.ORG_CREATED
> {
  readonly eventType = WebhookEventType.ORG_CREATED;
  readonly data: OrgPayload;
  readonly timestamp: Date;

  constructor(org: Org) {
    super();
    this.data = mapOrgToWebhookPayload(org);
    this.timestamp = new Date();
  }
}
