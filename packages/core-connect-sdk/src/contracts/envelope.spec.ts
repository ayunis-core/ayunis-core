import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseWebhookEvent } from "./envelope.js";
import { WEBHOOK_EVENT_TYPE } from "./event-types.js";

const fixtures: unknown[] = JSON.parse(
  readFileSync(
    new URL("../../fixtures/core-webhooks.json", import.meta.url),
    "utf8",
  ),
);

describe("published Core wire contract", () => {
  it("accepts producer fixtures for every event type", () => {
    const events = fixtures.map((fixture) => {
      const result = parseWebhookEvent(fixture);
      if (!result.ok) throw result.error;
      return result.event;
    });
    expect(
      events.map((event) => event.eventType).sort((a, b) => a.localeCompare(b)),
    ).toEqual(
      Object.values(WEBHOOK_EVENT_TYPE).sort((a, b) => a.localeCompare(b)),
    );
  });

  it("accepts the monthly credit snapshot already emitted by Core", () => {
    expect(
      parseWebhookEvent({
        eventId: "00000000-0000-4000-8000-000000000004",
        timestamp: "2026-10-29T12:00:00.000Z",
        eventType: "usage.monthly_credits_snapshot",
        data: {
          organizationId: "00000000-0000-4000-8000-000000000004",
          periodStart: "2026-10-01T00:00:00.000Z",
          periodEnd: "2026-11-01T00:00:00.000Z",
          creditsConsumed: 10000,
        },
      }).ok,
    ).toBe(true);
  });

  it.each([null, "2026-10-30T12:00:00.000Z"])(
    "accepts academy progress with participation date %s",
    (participationConfirmedAt) => {
      expect(
        parseWebhookEvent({
          eventId: "00000000-0000-4000-8000-000000000004",
          timestamp: "2026-10-30T12:00:00.000Z",
          eventType: "academy.progress_updated",
          data: {
            userId: "00000000-0000-4000-8000-000000000004",
            orgId: "00000000-0000-4000-8000-000000000004",
            userEmail: "admin@municipality.example",
            userName: "Municipal Admin",
            started: true,
            participationConfirmedAt,
          },
        }).ok,
      ).toBe(true);
    },
  );

  it("rejects malformed known events and unknown event types", () => {
    expect(
      parseWebhookEvent({ eventType: "subscription.created", data: {} }).ok,
    ).toBe(false);
    expect(parseWebhookEvent({ eventType: "unknown.event", data: {} }).ok).toBe(
      false,
    );
  });
  it("rejects a non-empty password hash in a user payload", () => {
    const fixture = fixtures.find(
      (value) => (value as { eventType: string }).eventType === "user.created",
    ) as { data: Record<string, unknown> };
    expect(
      parseWebhookEvent({
        ...fixture,
        data: {
          ...fixture.data,
          // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- Negative contract fixture, never used as a credential.
          passwordHash: "not-for-delivery",
        },
      }).ok,
    ).toBe(false);
  });
});
