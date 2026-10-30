import { UserCreatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/user-created.webhook-event';
import { UserUpdatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/user-updated.webhook-event';
import { OrgCreatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/org-created.webhook-event';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  WEBHOOK_EVENT_TYPE,
  webhookEnvelopeSchema,
} from '@ayunis-core/connect-sdk/contracts';
import { createContractFixtures } from 'src/integrations/webhooks/testing/contract-fixtures';

describe('Core producer wire contract', () => {
  it('covers every published event using real Core event constructors', () => {
    const fixtures = createContractFixtures();
    const parsed = fixtures.map((fixture) =>
      webhookEnvelopeSchema.parse(fixture),
    );
    expect(
      parsed.map((event) => event.eventType).sort((a, b) => a.localeCompare(b)),
    ).toEqual(
      Object.values(WEBHOOK_EVENT_TYPE).sort((a, b) => a.localeCompare(b)),
    );
  });
  it('keeps the distributed consumer fixtures equal to current Core output', () => {
    const fixtures: unknown = JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          '../packages/core-connect-sdk/fixtures/core-webhooks.json',
        ),
        'utf8',
      ),
    );
    expect(fixtures).toEqual(createContractFixtures());
  });
  it('maps domain dates and sanitizes nested organization users before serialization', () => {
    const user = new User({
      orgId: '00000000-0000-4000-8000-000000000004',
      email: 'admin@municipality.example',
      name: 'Admin',
      role: UserRole.ADMIN,
      emailVerified: true,
      passwordHash: 'never-send-this',
      hasAcceptedMarketing: false,
    });
    const org = new Org({ name: 'Municipality', users: [user] });
    const created = new UserCreatedWebhookEvent({ user, orgId: org.id });
    const updated = new UserUpdatedWebhookEvent(user);
    const organization = new OrgCreatedWebhookEvent(org);
    expect(created.data.createdAt).toBe(user.createdAt.toISOString());
    expect(updated.data.updatedAt).toBe(user.updatedAt.toISOString());
    expect(organization.data.users[0]).toMatchObject({
      passwordHash: '',
      createdAt: user.createdAt.toISOString(),
    });
    expect(organization.data.users[0]).not.toHaveProperty('lockedAt');
    expect(organization.data).not.toBe(org);
  });
});
