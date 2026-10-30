import type {
  UserDeletedPayload,
  EventPayload,
} from '@ayunis-core/connect-sdk/contracts';
import type {
  WebhookEvent,
  AnyWebhookEvent,
} from 'src/integrations/webhooks/domain/webhook-event.entity';

// @ts-expect-error The event generic is an event key, never an arbitrary payload.
type InvalidPayloadParameter = WebhookEvent<UserDeletedPayload>;
export type WebhookTypeChecks = [
  InvalidPayloadParameter,
  EventPayload<'user.deleted'>,
];

// @ts-expect-error Every producer must specify its canonical event key.
type MissingEventKey = WebhookEvent;

type Assert<T extends true> = T;
type WrongPayload = Assert<
  // @ts-expect-error A user-deleted payload cannot be assigned to an organization event.
  UserDeletedPayload extends WebhookEvent<'org.created'>['data'] ? true : false
>;
type MismatchedEvent = Omit<WebhookEvent<'org.created'>, 'data'> & {
  data: UserDeletedPayload;
};
type WrongEnvelope = Assert<
  // @ts-expect-error General consumers preserve event/payload correlation too.
  MismatchedEvent extends AnyWebhookEvent ? true : false
>;
export type AdditionalWebhookTypeChecks = [
  MissingEventKey,
  WrongPayload,
  WrongEnvelope,
];
