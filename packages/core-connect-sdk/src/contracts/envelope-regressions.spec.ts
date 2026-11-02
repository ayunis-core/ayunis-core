import { describe, it, expect } from "vitest";
import { parseWebhookEvent } from "./envelope.js";
import { WEBHOOK_EVENT_TYPE } from "./event-types.js";

// Real-looking v4 UUIDs (variant nibble 8-b, version nibble 4) so that
// zod 4's strict `z.uuid()` accepts them. Using `1111…` style ids
// silently fails the variant check.
const ORG_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const EVENT_ID = "33333333-3333-4333-8333-333333333333";
const SUB_ID = "44444444-4444-4444-8444-444444444444";
const MODEL_ID = "55555555-5555-4555-8555-555555555555";
const REQUEST_ID = "66666666-6666-4666-8666-666666666666";
const USAGE_ID = "77777777-7777-4777-8777-777777777777";
const API_KEY_ID = "88888888-8888-4888-8888-888888888888";
const SKILL_ID = "99999999-9999-4999-8999-999999999999";
const INTEGRATION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const ISO_TIME = "2024-01-15T12:00:00.000Z";

// `department: null` is included by default because that's the bulk of
// `user.updated` wire traffic upstream (the `department` TypeORM column
// is `nullable: true` and the user mapper passes the value through
// unchanged). Every test that inherits from `baseUser` therefore
// exercises the realistic shape. The dedicated "department omitted"
// test below pins the permissive-contract branch separately.
const baseUser = {
  id: USER_ID,
  email: "admin@acme.test",
  emailVerified: true,
  passwordHash: "",
  role: "admin",
  systemRole: "customer",
  orgId: ORG_ID,
  name: "Admin User",
  hasAcceptedMarketing: false,
  department: null,
  createdAt: ISO_TIME,
  updatedAt: ISO_TIME,
};

const baseInvitedUser = {
  id: USER_ID,
  email: "invited.user@acme.test",
  orgId: ORG_ID,
  name: "invited.user@acme.test",
};

const baseOrg = {
  id: ORG_ID,
  name: "Acme Inc.",
  users: [baseUser],
  createdAt: ISO_TIME,
  updatedAt: ISO_TIME,
};

const baseSeatBasedSubscription = {
  id: SUB_ID,
  orgId: ORG_ID,
  type: "SEAT_BASED",
  noOfSeats: 25,
  pricePerSeat: 49,
  renewalCycle: "monthly",
  renewalCycleAnchor: "2024-01-15T00:00:00.000Z",
  cancelledAt: null,
  startsAt: ISO_TIME,
  createdAt: ISO_TIME,
  updatedAt: ISO_TIME,
};

const baseUsageBasedSubscription = {
  id: SUB_ID,
  orgId: ORG_ID,
  type: "USAGE_BASED",
  monthlyCredits: 10000,
  cancelledAt: null,
  startsAt: ISO_TIME,
  createdAt: ISO_TIME,
  updatedAt: ISO_TIME,
};

const baseBillingInfo = {
  companyName: "Acme Holdings Ltd.",
  street: "Hauptstr.",
  houseNumber: "1",
  postalCode: "10115",
  city: "Berlin",
  country: "DE",
  vatNumber: "DE123456789",
  orgId: ORG_ID,
  subscriptionId: SUB_ID,
};

const baseUsageCollected = {
  id: USAGE_ID,
  userId: USER_ID,
  organizationId: ORG_ID,
  modelId: MODEL_ID,
  modelName: "gpt-4o",
  provider: "openai",
  inputTokens: 100,
  outputTokens: 50,
  totalTokens: 150,
  cost: 0.0123,
  creditsConsumed: 1,
  requestId: REQUEST_ID,
  createdAt: ISO_TIME,
};

function envelope(eventType: string, data: unknown) {
  return {
    eventId: EVENT_ID,
    eventType,
    timestamp: ISO_TIME,
    data,
  };
}

describe("parseWebhookEvent — happy paths (one per event type)", () => {
  it("parses an org.created envelope and narrows data to OrgPayload", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.ORG_CREATED, baseOrg),
    );

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType === WEBHOOK_EVENT_TYPE.ORG_CREATED
    ) {
      expect(result.event.data.id).toBe(ORG_ID);
      expect(result.event.data.name).toBe("Acme Inc.");
      expect(result.event.data.users).toHaveLength(1);
    } else {
      throw new Error("expected org.created variant");
    }
  });

  it("parses a user.created envelope", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USER_CREATED, baseUser),
    );

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType === WEBHOOK_EVENT_TYPE.USER_CREATED
    ) {
      expect(result.event.data.email).toBe("admin@acme.test");
      expect(result.event.data.orgId).toBe(ORG_ID);
    } else {
      throw new Error("expected user.created variant");
    }
  });

  it("parses a user.invited envelope", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USER_INVITED, baseInvitedUser),
    );

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType === WEBHOOK_EVENT_TYPE.USER_INVITED
    ) {
      expect(result.event.data.email).toBe("invited.user@acme.test");
      expect(result.event.data.orgId).toBe(ORG_ID);
    } else {
      throw new Error("expected user.invited variant");
    }
  });

  it("parses a user.created envelope with the optional orgName enrichment (AYC-445)", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USER_CREATED, {
        ...baseUser,
        orgName: "Acme Inc.",
      }),
    );

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType === WEBHOOK_EVENT_TYPE.USER_CREATED
    ) {
      expect(result.event.data.orgName).toBe("Acme Inc.");
    } else {
      throw new Error("expected user.created variant");
    }
  });

  it("rejects user.updated carrying orgName (enrichment is user.created-only)", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USER_UPDATED, {
        ...baseUser,
        orgName: "Acme Inc.",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("parses a user.updated envelope", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USER_UPDATED, {
        ...baseUser,
        name: "Renamed User",
      }),
    );

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType === WEBHOOK_EVENT_TYPE.USER_UPDATED
    ) {
      expect(result.event.data.name).toBe("Renamed User");
    } else {
      throw new Error("expected user.updated variant");
    }
  });

  it("parses a user.deleted envelope whose data carries id, email and orgId", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USER_DELETED, {
        id: USER_ID,
        email: "deleted@acme.test",
        orgId: ORG_ID,
      }),
    );

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType === WEBHOOK_EVENT_TYPE.USER_DELETED
    ) {
      // Force compile-time narrowing: accessing `.id` / `.email` /
      // `.orgId` would fail type-checking if the discriminator widened
      // `data`.
      expect(result.event.data.id).toBe(USER_ID);
      expect(result.event.data.email).toBe("deleted@acme.test");
      expect(result.event.data.orgId).toBe(ORG_ID);
    } else {
      throw new Error("expected user.deleted variant");
    }
  });

  it("parses an onboarding.updated envelope with previous and current progress", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.ONBOARDING_UPDATED, {
        userId: USER_ID,
        orgId: ORG_ID,
        userEmail: "admin@acme.test",
        userName: "Admin User",
        userRole: "admin",
        previousCompletedStepIds: ["sendFirstMessage"],
        completedStepIds: ["sendFirstMessage", "uploadDocument"],
        previousHidden: false,
        hidden: true,
      }),
    );

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType === WEBHOOK_EVENT_TYPE.ONBOARDING_UPDATED
    ) {
      expect(result.event.data.completedStepIds).toEqual([
        "sendFirstMessage",
        "uploadDocument",
      ]);
    } else {
      throw new Error("expected onboarding.updated variant");
    }
  });

  it("parses onboarding progress for a manager", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.ONBOARDING_UPDATED, {
        userId: USER_ID,
        orgId: ORG_ID,
        userEmail: "manager@acme.test",
        userName: "Manager User",
        userRole: "manager",
        previousCompletedStepIds: [],
        completedStepIds: ["sendFirstMessage"],
        previousHidden: false,
        hidden: false,
      }),
    );

    expect(result.ok).toBe(true);
  });

  it("rejects a user.deleted envelope whose data is the legacy bare UUID", () => {
    // Pre-upstream-change deliveries (a bare UUID string, no email)
    // must fail parsing rather than be silently mishandled.
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USER_DELETED, USER_ID),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects a user.deleted envelope missing orgId", () => {
    // The soft-delete lookup must be scoped to the customer, so the
    // payload must carry orgId — a payload without it fails parsing
    // rather than falling back to an unscoped (cross-tenant) match.
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USER_DELETED, {
        id: USER_ID,
        email: "deleted@acme.test",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("parses a SEAT_BASED subscription.created envelope", () => {
    const result = parseWebhookEvent(
      envelope(
        WEBHOOK_EVENT_TYPE.SUBSCRIPTION_CREATED,
        baseSeatBasedSubscription,
      ),
    );

    expect(result.ok).toBe(true);
    if (result.ok && result.event.eventType === "subscription.created") {
      expect(result.event.data.type).toBe("SEAT_BASED");
      if (result.event.data.type === "SEAT_BASED") {
        expect(result.event.data.noOfSeats).toBe(25);
      }
    }
  });

  it("parses a USAGE_BASED subscription.created envelope", () => {
    const result = parseWebhookEvent(
      envelope(
        WEBHOOK_EVENT_TYPE.SUBSCRIPTION_CREATED,
        baseUsageBasedSubscription,
      ),
    );

    expect(result.ok).toBe(true);
    if (result.ok && result.event.eventType === "subscription.created") {
      expect(result.event.data.type).toBe("USAGE_BASED");
      if (result.event.data.type === "USAGE_BASED") {
        expect(result.event.data.monthlyCredits).toBe(10000);
      }
    }
  });

  it("parses a subscription.cancelled envelope", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.SUBSCRIPTION_CANCELLED, {
        ...baseSeatBasedSubscription,
        cancelledAt: ISO_TIME,
      }),
    );

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType === WEBHOOK_EVENT_TYPE.SUBSCRIPTION_CANCELLED &&
      result.event.data.type === "SEAT_BASED"
    ) {
      expect(result.event.data.cancelledAt).toBe(ISO_TIME);
      expect(result.event.data.noOfSeats).toBe(25);
    } else {
      throw new Error("expected SEAT_BASED subscription.cancelled variant");
    }
  });

  it("parses a subscription.uncancelled envelope", () => {
    const result = parseWebhookEvent(
      envelope(
        WEBHOOK_EVENT_TYPE.SUBSCRIPTION_UNCANCELLED,
        baseSeatBasedSubscription,
      ),
    );

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType === WEBHOOK_EVENT_TYPE.SUBSCRIPTION_UNCANCELLED &&
      result.event.data.type === "SEAT_BASED"
    ) {
      expect(result.event.data.cancelledAt).toBeNull();
      expect(result.event.data.noOfSeats).toBe(25);
    } else {
      throw new Error("expected SEAT_BASED subscription.uncancelled variant");
    }
  });

  it("parses a subscription.seats_updated envelope", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.SUBSCRIPTION_SEATS_UPDATED, {
        ...baseSeatBasedSubscription,
        noOfSeats: 30,
      }),
    );

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType ===
        WEBHOOK_EVENT_TYPE.SUBSCRIPTION_SEATS_UPDATED &&
      result.event.data.type === "SEAT_BASED"
    ) {
      expect(result.event.data.noOfSeats).toBe(30);
    } else {
      throw new Error("expected SEAT_BASED subscription.seats_updated variant");
    }
  });

  it("parses a subscription.billing_info_updated envelope", () => {
    const result = parseWebhookEvent(
      envelope(
        WEBHOOK_EVENT_TYPE.SUBSCRIPTION_BILLING_INFO_UPDATED,
        baseBillingInfo,
      ),
    );

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType ===
        WEBHOOK_EVENT_TYPE.SUBSCRIPTION_BILLING_INFO_UPDATED
    ) {
      // Narrowed correctly: BillingInfoPayload has companyName
      expect(result.event.data.companyName).toBe("Acme Holdings Ltd.");
    } else {
      throw new Error("expected subscription.billing_info_updated variant");
    }
  });

  it("parses product usage and install envelopes", () => {
    const userIdentity = {
      userId: USER_ID,
      orgId: ORG_ID,
      userEmail: "admin@acme.test",
      userName: "Admin User",
    };
    const events = [
      envelope(WEBHOOK_EVENT_TYPE.SKILL_USED, {
        ...userIdentity,
        skillId: SKILL_ID,
        skillName: "Legal Research",
      }),
      envelope(WEBHOOK_EVENT_TYPE.SKILL_INSTALLED, {
        ...userIdentity,
        identifier: "legal-research",
      }),
      envelope(WEBHOOK_EVENT_TYPE.INTEGRATION_USED, {
        ...userIdentity,
        integrationId: INTEGRATION_ID,
        integrationName: "Council Data",
      }),
      envelope(WEBHOOK_EVENT_TYPE.INTEGRATION_INSTALLED, {
        ...userIdentity,
        identifier: "council-data",
      }),
    ];

    for (const event of events) {
      expect(parseWebhookEvent(event).ok).toBe(true);
    }
  });

  it("parses a usage.collected envelope from an API key", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USAGE_COLLECTED, {
        ...baseUsageCollected,
        userId: null,
        apiKeyId: API_KEY_ID,
      }),
    );

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType === WEBHOOK_EVENT_TYPE.USAGE_COLLECTED
    ) {
      expect(result.event.data.apiKeyId).toBe(API_KEY_ID);
    } else {
      throw new Error("expected API usage.collected variant");
    }
  });

  it("parses a usage.collected envelope", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USAGE_COLLECTED, baseUsageCollected),
    );

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType === WEBHOOK_EVENT_TYPE.USAGE_COLLECTED
    ) {
      // Narrowed correctly: UsageCollectedPayload has totalTokens
      expect(result.event.data.totalTokens).toBe(150);
    } else {
      throw new Error("expected usage.collected variant");
    }
  });

  it("parses a monthly credit snapshot envelope", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USAGE_MONTHLY_CREDITS_SNAPSHOT, {
        organizationId: ORG_ID,
        periodStart: "2024-01-01T00:00:00.000Z",
        periodEnd: "2024-02-01T00:00:00.000Z",
        creditsConsumed: 1250,
      }),
    );

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType ===
        WEBHOOK_EVENT_TYPE.USAGE_MONTHLY_CREDITS_SNAPSHOT
    ) {
      expect(result.event.data.creditsConsumed).toBe(1250);
    } else {
      throw new Error("expected monthly credit snapshot variant");
    }
  });
});

describe("parseWebhookEvent — rejection paths", () => {
  it("rejects an envelope missing eventId", () => {
    const result = parseWebhookEvent({
      eventType: WEBHOOK_EVENT_TYPE.ORG_CREATED,
      timestamp: ISO_TIME,
      data: baseOrg,
    });

    expect(result.ok).toBe(false);
  });

  it("rejects an envelope with a non-UUID eventId", () => {
    const result = parseWebhookEvent({
      eventId: "not-a-uuid",
      eventType: WEBHOOK_EVENT_TYPE.ORG_CREATED,
      timestamp: ISO_TIME,
      data: baseOrg,
    });

    expect(result.ok).toBe(false);
  });

  it("rejects an envelope with a non-ISO timestamp", () => {
    const result = parseWebhookEvent({
      eventId: EVENT_ID,
      eventType: WEBHOOK_EVENT_TYPE.ORG_CREATED,
      timestamp: "tomorrow",
      data: baseOrg,
    });

    expect(result.ok).toBe(false);
  });

  it("rejects an envelope with an unknown eventType", () => {
    const result = parseWebhookEvent({
      eventId: EVENT_ID,
      eventType: "something.invented",
      timestamp: ISO_TIME,
      data: {},
    });

    expect(result.ok).toBe(false);
  });

  it("rejects org.created with the wrong data shape (e.g. missing name)", () => {
    const orgWithoutName: Record<string, unknown> = { ...baseOrg };
    delete orgWithoutName.name;
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.ORG_CREATED, orgWithoutName),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects user.created with an empty email (mirrors `string().min(1)`)", () => {
    // The source `User.email` is plain `string`, so we mirror that with
    // `z.string().min(1)` instead of `z.email()`. The minimum-length
    // guard is the only thing left to pin — anything looser would let
    // `''` through, which is structurally invalid for any downstream
    // sink. A future loosening to bare `z.string()` would break this
    // test, which is the intent.
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USER_CREATED, {
        ...baseUser,
        email: "",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("accepts user.created with a non-RFC-5322 email like `admin@localhost` (mirrors source `string`)", () => {
    // Super-admin seeds and dev fixtures use addresses that fail strict
    // RFC validation. Connect must NOT be stricter than the source.
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USER_CREATED, {
        ...baseUser,
        email: "admin@localhost",
      }),
    );

    expect(result.ok).toBe(true);
  });

  it("rejects an incomplete user.deleted payload", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USER_DELETED, { id: USER_ID }),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects subscription.created with an unknown subscription type", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.SUBSCRIPTION_CREATED, {
        ...baseSeatBasedSubscription,
        type: "CARRIER_PIGEON",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects usage.collected with a non-numeric token count", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USAGE_COLLECTED, {
        ...baseUsageCollected,
        inputTokens: "lots",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects usage.collected with an unknown provider", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USAGE_COLLECTED, {
        ...baseUsageCollected,
        provider: "carrier-pigeon",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects subscription.created with an unknown renewalCycle", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.SUBSCRIPTION_CREATED, {
        ...baseSeatBasedSubscription,
        renewalCycle: "fortnightly",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects subscription.created when renewalCycleAnchor is a date-only string", () => {
    // The source mapper calls `.toISOString()`, so the wire format is
    // always the full ISO 8601 datetime ending in `Z`. A date-only value
    // is rejected to keep the contract symmetrical with the other date
    // fields on the schema.
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.SUBSCRIPTION_CREATED, {
        ...baseSeatBasedSubscription,
        renewalCycleAnchor: "2024-01-15",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects an envelope with an unknown top-level field (strict mode)", () => {
    const result = parseWebhookEvent({
      ...envelope(WEBHOOK_EVENT_TYPE.ORG_CREATED, baseOrg),
      surpriseField: "should-not-be-here",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Surface the offending key in the error so reviewers can spot drift.
      const flatErr = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.code}`)
        .join("; ");
      expect(flatErr).toMatch(/surpriseField|unrecognized/i);
    }
  });

  it("rejects a payload with an unknown nested field (strict mode)", () => {
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USER_UPDATED, {
        ...baseUser,
        unexpectedNewField: 42,
      }),
    );

    expect(result.ok).toBe(false);
  });

  // Strict-mode regression pin for every payload schema.
  // `@ayunis-core/connect-sdk/contracts` promises that adding a field upstream fails
  // loudly here. That promise is only worth as much as the test that
  // pins it — cover every `.strict()` schema, not just the two that
  // happened to have a rejection test.
  it.each([
    [
      "subscription.created (SEAT_BASED)",
      WEBHOOK_EVENT_TYPE.SUBSCRIPTION_CREATED,
      { ...baseSeatBasedSubscription, surpriseField: 1 },
    ],
    [
      "subscription.created (USAGE_BASED)",
      WEBHOOK_EVENT_TYPE.SUBSCRIPTION_CREATED,
      { ...baseUsageBasedSubscription, surpriseField: 1 },
    ],
    [
      "subscription.billing_info_updated",
      WEBHOOK_EVENT_TYPE.SUBSCRIPTION_BILLING_INFO_UPDATED,
      { ...baseBillingInfo, surpriseField: 1 },
    ],
    [
      "usage.collected",
      WEBHOOK_EVENT_TYPE.USAGE_COLLECTED,
      { ...baseUsageCollected, surpriseField: 1 },
    ],
  ])(
    "rejects %s with an unknown nested field (strict mode)",
    (_name, eventType, data) => {
      const result = parseWebhookEvent(envelope(eventType, data));
      expect(result.ok).toBe(false);
    },
  );

  it("rejects a top-level non-object body", () => {
    expect(parseWebhookEvent("totally not an envelope").ok).toBe(false);
    expect(parseWebhookEvent(null).ok).toBe(false);
    expect(parseWebhookEvent(42).ok).toBe(false);
  });
});

/**
 * Wire-format `null` audit. These tests pin every field whose source
 * TypeORM column is `nullable: true` and whose mapper passes the value
 * through unchanged — i.e. every field that can legitimately arrive on
 * the wire as `null` (because `JSON.stringify` keeps `null` and only
 * drops `undefined`). C1 in the QA report was a real bug exactly
 * because these cases were not pinned.
 */
describe("parseWebhookEvent — nullable wire fields", () => {
  it("accepts user.updated with `department: null` (the C1 case)", () => {
    // `user.record.ts:43` is `@Column({ nullable: true }) department?: string`.
    // TypeORM hydrates SQL NULL as JS `null`; the user mapper and
    // `cleanUserData` both pass it through unchanged; `JSON.stringify`
    // keeps the `null`. Connect MUST accept this shape — it is the bulk
    // of `user.updated` traffic.
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USER_UPDATED, {
        ...baseUser,
        department: null,
      }),
    );

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType === WEBHOOK_EVENT_TYPE.USER_UPDATED
    ) {
      expect(result.event.data.department).toBeNull();
    } else {
      throw new Error("expected user.updated variant");
    }
  });

  it("accepts user.updated with `department` omitted entirely", () => {
    // `JSON.stringify` drops `undefined`, so `department` may simply be
    // missing from the wire object. `.nullish()` handles both null and
    // undefined; this test pins the undefined branch by constructing
    // a payload that never has a `department` key at all. We start from
    // `baseUser` (which carries `department: null` to mirror the bulk
    // of upstream traffic) and explicitly drop the key to construct the
    // omitted-key shape.
    const userWithoutDepartment: Record<string, unknown> = { ...baseUser };
    delete userWithoutDepartment.department;
    expect(
      Object.prototype.hasOwnProperty.call(userWithoutDepartment, "department"),
    ).toBe(false);
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.USER_UPDATED, userWithoutDepartment),
    );

    expect(result.ok).toBe(true);
  });

  it("accepts subscription.billing_info_updated with `vatNumber: null` and `subText: null`", () => {
    // `subscription-billing-info.record.ts` declares both columns as
    // `nullable: true`, and the billing-info mapper passes them straight
    // through. The wire payload can carry `null` for either.
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.SUBSCRIPTION_BILLING_INFO_UPDATED, {
        ...baseBillingInfo,
        vatNumber: null,
        subText: null,
      }),
    );

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType ===
        WEBHOOK_EVENT_TYPE.SUBSCRIPTION_BILLING_INFO_UPDATED
    ) {
      expect(result.event.data.vatNumber).toBeNull();
      expect(result.event.data.subText).toBeNull();
    } else {
      throw new Error("expected subscription.billing_info_updated variant");
    }
  });

  it("accepts subscription.cancelled with `cancelledAt` set and the SEAT_BASED variant", () => {
    // `cancelledAt` is the only nullable date in `subscriptionBaseFields`
    // and was already correctly modelled with `.nullable()`. This test
    // pins both branches: the happy-path tests above cover `null`, this
    // covers a real ISO timestamp.
    const result = parseWebhookEvent(
      envelope(WEBHOOK_EVENT_TYPE.SUBSCRIPTION_CANCELLED, {
        ...baseSeatBasedSubscription,
        cancelledAt: ISO_TIME,
      }),
    );

    expect(result.ok).toBe(true);
  });
});

/**
 * Manual end-to-end sanity check from the QA report. These build the
 * exact wire shapes the real Ayunis Core emits today and confirm they
 * round-trip cleanly through `parseWebhookEvent`. They are deliberately
 * separate from the C1 nullable audit — the audit pins individual
 * fields, while these pin whole envelopes.
 */
describe("parseWebhookEvent — realistic wire envelopes", () => {
  it("parses a realistic `org.created` envelope where `users` is empty", () => {
    // Today, `register-user.use-case.ts` emits `OrgCreatedEvent` BEFORE
    // attaching the admin user, so `org.users` is always `[]` at the
    // moment the event fires. The schema accepts a permissive inner
    // user shape that's never actually populated, but we still want to
    // pin the empty-array case so a future cleaning pass on `org.users`
    // doesn't silently break parsing.
    const realisticOrgCreated = {
      eventId: EVENT_ID,
      eventType: WEBHOOK_EVENT_TYPE.ORG_CREATED,
      timestamp: ISO_TIME,
      data: {
        id: ORG_ID,
        name: "Acme Inc.",
        users: [],
        createdAt: ISO_TIME,
        updatedAt: ISO_TIME,
      },
    };

    const result = parseWebhookEvent(realisticOrgCreated);

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType === WEBHOOK_EVENT_TYPE.ORG_CREATED
    ) {
      expect(result.event.data.users).toEqual([]);
      expect(result.event.data.id).toBe(ORG_ID);
    } else {
      throw new Error("expected org.created variant");
    }
  });

  it("parses a realistic `user.updated` envelope where `department: null`", () => {
    // The C1 wire-shape end-to-end. Mirrors the most common
    // `user.updated` payload Ayunis Core sends today: a freshly cleaned
    // user (passwordHash blanked), no department set, all other fields
    // present.
    const realisticUserUpdated = {
      eventId: EVENT_ID,
      eventType: WEBHOOK_EVENT_TYPE.USER_UPDATED,
      timestamp: ISO_TIME,
      data: {
        id: USER_ID,
        email: "admin@acme.test",
        emailVerified: true,
        passwordHash: "",
        role: "admin",
        systemRole: "customer",
        orgId: ORG_ID,
        name: "Admin User",
        hasAcceptedMarketing: false,
        department: null,
        createdAt: ISO_TIME,
        updatedAt: ISO_TIME,
      },
    };

    const result = parseWebhookEvent(realisticUserUpdated);

    expect(result.ok).toBe(true);
    if (
      result.ok &&
      result.event.eventType === WEBHOOK_EVENT_TYPE.USER_UPDATED
    ) {
      expect(result.event.data.department).toBeNull();
      expect(result.event.data.passwordHash).toBe("");
    } else {
      throw new Error("expected user.updated variant");
    }
  });
});

describe("monthly credit update payload", () => {
  it.each([undefined, null, "10000"])(
    "rejects missing or invalid monthlyCredits %s",
    (monthlyCredits) => {
      const result = parseWebhookEvent({
        eventId: "33333333-3333-4333-8333-333333333333",
        eventType: "subscription.monthly_credits_updated",
        timestamp: "2026-09-30T10:00:00.000Z",
        data: {
          id: "44444444-4444-4444-8444-444444444444",
          orgId: "11111111-1111-4111-8111-111111111111",
          type: "USAGE_BASED",
          monthlyCredits,
          cancelledAt: null,
          startsAt: "2026-09-01T10:00:00.000Z",
          createdAt: "2026-09-01T10:00:00.000Z",
          updatedAt: "2026-09-30T10:00:00.000Z",
        },
      });
      expect(result.ok).toBe(false);
    },
  );
});

describe("Core billing wire compatibility", () => {
  const id = "00000000-0000-4000-8000-000000000004";
  const timestamp = "2026-10-29T12:00:00.000Z";
  it("accepts fixed-term subscription expiry from Core", () => {
    const result = parseWebhookEvent({
      eventId: id,
      eventType: "subscription.expired",
      timestamp,
      data: {
        id,
        orgId: id,
        type: "USAGE_BASED",
        monthlyCredits: 1000,
        cancelledAt: null,
        endsAt: timestamp,
        startsAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.event.data).toHaveProperty("endsAt", timestamp);
  });
  it.each(["addon.activated", "addon.deactivated"])(
    "accepts service-originated %s with no actor",
    (eventType) => {
      expect(
        parseWebhookEvent({
          eventId: id,
          eventType,
          timestamp,
          data: {
            orgId: id,
            addonType: "ayunis_core_academy",
            actorUserId: null,
          },
        }).ok,
      ).toBe(true);
    },
  );
});
