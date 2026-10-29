import { z } from "zod";

const isoDateTime = z.iso.datetime();

const userSchema = z
  .object({
    id: z.uuid(),
    email: z.string().min(1),
    emailVerified: z.boolean(),
    passwordHash: z.literal(""),
    role: z.enum(["admin", "manager", "user"]),
    systemRole: z.enum(["customer", "super_admin"]),
    orgId: z.uuid(),
    name: z.string(),
    hasAcceptedMarketing: z.boolean(),
    department: z.string().nullish(),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  })
  .strict();

const orgSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    users: z.array(userSchema),
    archived: z.boolean().optional(),
    hideIndividualUsage: z.boolean().optional(),
    sessionVersion: z.number().optional(),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  })
  .strict();

const userCreatedDataSchema = userSchema
  .extend({
    orgName: z.string().optional(),
  })
  .strict();

const userInvitedDataSchema = z
  .object({
    id: z.uuid(),
    email: z.string().min(1),
    orgId: z.uuid(),
    name: z.string(),
  })
  .strict();

const userUpdatedDataSchema = userSchema;

const userDeletedDataSchema = z
  .object({
    id: z.uuid(),
    email: z.string().min(1),
    orgId: z.uuid(),
  })
  .strict();

const subscriptionBaseFields = {
  id: z.uuid(),
  orgId: z.uuid(),
  cancelledAt: isoDateTime.nullable(),
  // Older Core producers omit this field.
  endsAt: isoDateTime.nullable().optional(),
  startsAt: isoDateTime,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
};

const seatBasedSubscriptionSchema = z
  .object({
    ...subscriptionBaseFields,
    type: z.literal("SEAT_BASED"),
    noOfSeats: z.number(),
    pricePerSeat: z.number(),
    renewalCycle: z.enum(["monthly", "yearly"]),
    renewalCycleAnchor: isoDateTime,
  })
  .strict();

export const usageBasedSubscriptionSchema = z
  .object({
    ...subscriptionBaseFields,
    type: z.literal("USAGE_BASED"),
    monthlyCredits: z.number(),
  })
  .strict();

const subscriptionDataSchema = z.discriminatedUnion("type", [
  seatBasedSubscriptionSchema,
  usageBasedSubscriptionSchema,
]);

const addonSchema = z
  .object({
    orgId: z.uuid(),
    addonType: z.literal("ayunis_core_academy"),
    actorUserId: z.uuid().nullable(),
  })
  .strict();

const billingInfoDataSchema = z
  .object({
    companyName: z.string(),
    street: z.string(),
    houseNumber: z.string(),
    postalCode: z.string(),
    city: z.string(),
    country: z.string(),
    vatNumber: z.string().nullish(),
    subText: z.string().nullish(),
    orgId: z.string(),
    subscriptionId: z.string(),
  })
  .strict();

const usageCollectedDataSchema = z
  .object({
    id: z.uuid(),
    // `null` for API-key-triggered usage (`Usage.userId: UUID | null` in
    // ayunis-core-backend; XOR with `apiKeyId`). `apiKeyId` is optional only
    // for the coordinated rollout: Connect must accept payloads from Core
    // versions that predate the enrichment.
    userId: z.uuid().nullable(),
    apiKeyId: z.uuid().nullable().optional(),
    organizationId: z.uuid(),
    modelId: z.uuid(),
    modelName: z.string(),
    provider: z.enum([
      "openai",
      "anthropic",
      "bedrock",
      "mistral",
      "ollama",
      "synaforce",
      "ayunis",
      "otc",
      "azure",
      "gemini",
      "stackit",
      "scaleway",
    ]),
    inputTokens: z.number(),
    outputTokens: z.number(),
    totalTokens: z.number(),
    cost: z.number().optional(),
    creditsConsumed: z.number().optional(),
    requestId: z.uuid(),
    createdAt: isoDateTime,
    // Enrichment fields added for AYC-88. Ayunis Core sets them via
    // `user?.email` / `user?.name` in `UsageCollectedWebhookEvent`, so
    // they are `undefined` (key dropped by JSON.stringify) — never
    // `null` — when the usage has no user (API key) or the lookup
    // failed. `.optional()`, not `.nullish()`, mirrors that exactly.
    // `userEmail` mirrors `userSchema.email` (`.min(1)`), `userName`
    // mirrors `userSchema.name` (plain string, empty allowed).
    userEmail: z.string().min(1).optional(),
    userName: z.string().optional(),
  })
  .strict();

const chatSentDataSchema = z
  .object({
    userId: z.uuid(),
    orgId: z.uuid(),
    threadId: z.uuid(),
    messageId: z.uuid(),
    userEmail: z.string().min(1),
    userName: z.string(),
  })
  .strict();

const productUserFields = {
  userId: z.uuid(),
  orgId: z.uuid(),
  userEmail: z.string().min(1),
  userName: z.string(),
};

const skillUsedDataSchema = z
  .object({
    ...productUserFields,
    skillId: z.uuid(),
    skillName: z.string().min(1),
  })
  .strict();

const skillInstalledDataSchema = z
  .object({
    ...productUserFields,
    identifier: z.string().min(1),
  })
  .strict();

const integrationUsedDataSchema = z
  .object({
    ...productUserFields,
    integrationId: z.uuid(),
    integrationName: z.string().min(1),
  })
  .strict();

const integrationInstalledDataSchema = z
  .object({
    ...productUserFields,
    identifier: z.string().min(1),
  })
  .strict();

const onboardingUpdatedDataSchema = z
  .object({
    ...productUserFields,
    userRole: z.enum(["admin", "manager", "user"]),
    previousCompletedStepIds: z.array(z.string()),
    completedStepIds: z.array(z.string()),
    previousHidden: z.boolean(),
    hidden: z.boolean(),
  })
  .strict();

const monthlyCreditsSnapshotDataSchema = z
  .object({
    organizationId: z.uuid(),
    periodStart: isoDateTime,
    periodEnd: isoDateTime,
    creditsConsumed: z.number().nonnegative(),
  })
  .strict();

const academyProgressUpdatedSchema = z
  .object({
    ...productUserFields,
    started: z.boolean(),
    participationConfirmedAt: isoDateTime.nullable(),
  })
  .strict();

export const PAYLOAD_SCHEMAS = {
  monthlyCreditsSnapshot: monthlyCreditsSnapshotDataSchema,
  addon: addonSchema,
  academyProgressUpdated: academyProgressUpdatedSchema,
  org: orgSchema,
  userCreated: userCreatedDataSchema,
  userInvited: userInvitedDataSchema,
  userUpdated: userUpdatedDataSchema,
  userDeleted: userDeletedDataSchema,
  subscription: subscriptionDataSchema,
  usageBasedSubscription: usageBasedSubscriptionSchema,
  billingInfo: billingInfoDataSchema,
  usageCollected: usageCollectedDataSchema,
  chatSent: chatSentDataSchema,
  skillUsed: skillUsedDataSchema,
  skillInstalled: skillInstalledDataSchema,
  integrationUsed: integrationUsedDataSchema,
  integrationInstalled: integrationInstalledDataSchema,
  onboardingUpdated: onboardingUpdatedDataSchema,
} as const;

export type OrgPayload = z.infer<typeof orgSchema>;
export type UserPayload = z.infer<typeof userSchema>;
export type UserInvitedPayload = z.infer<typeof userInvitedDataSchema>;
export type UserDeletedPayload = z.infer<typeof userDeletedDataSchema>;
export type SubscriptionPayload = z.infer<typeof subscriptionDataSchema>;
export type SeatBasedSubscriptionPayload = z.infer<
  typeof seatBasedSubscriptionSchema
>;
export type UsageBasedSubscriptionPayload = z.infer<
  typeof usageBasedSubscriptionSchema
>;
export type BillingInfoPayload = z.infer<typeof billingInfoDataSchema>;
export type UsageCollectedPayload = z.infer<typeof usageCollectedDataSchema>;
export type ChatSentPayload = z.infer<typeof chatSentDataSchema>;
export type SkillUsedPayload = z.infer<typeof skillUsedDataSchema>;
export type SkillInstalledPayload = z.infer<typeof skillInstalledDataSchema>;
export type IntegrationUsedPayload = z.infer<typeof integrationUsedDataSchema>;
export type IntegrationInstalledPayload = z.infer<
  typeof integrationInstalledDataSchema
>;
export type OnboardingUpdatedPayload = z.infer<
  typeof onboardingUpdatedDataSchema
>;

export type AddonPayload = z.infer<typeof addonSchema>;

export type MonthlyCreditsSnapshotPayload = z.infer<
  typeof monthlyCreditsSnapshotDataSchema
>;

export type AcademyProgressUpdatedPayload = z.infer<
  typeof academyProgressUpdatedSchema
>;
