import type { SelectQueryBuilder } from 'typeorm';
import { SubscriptionRecord } from 'src/iam/subscriptions/infrastructure/persistence/local/schema/subscription.record';
import { TrialRecord } from 'src/iam/trials/infrastructure/persistence/local/schema/trial.record';
import type { OrgRecord } from './schema/org.record';

// SQL mirror of the subscriptions module's isActive()/getEffectiveAccessEnd(),
// which orgs cannot import (the module graph would cycle through users).
// Legacy cancellations without accessEndsAt end at the cancellation for
// usage-based, at the next renewal after it for seat-based, and at startsAt when
// cancelled before the start. generate_series adds the interval to the previous
// value, so month-end anchors clamp and stick like getNextDate
// (Jan 31 -> Feb 28 -> Mar 28). The callers' query must bind :now.
const CYCLE = `(CASE s."renewalCycle" WHEN 'yearly' THEN interval '1 year' ELSE interval '1 month' END)`;
const NEXT_RENEWAL_AFTER_CANCELLATION = `(SELECT min(renewal) FROM generate_series(s."renewalCycleAnchor", s."cancelledAt" + ${CYCLE}, ${CYCLE}) AS renewal WHERE renewal > s."cancelledAt")`;
const LEGACY_ACCESS_END = `CASE WHEN s."cancelledAt" < s."startsAt" THEN s."startsAt" WHEN s.type = 'SEAT_BASED' THEN ${NEXT_RENEWAL_AFTER_CANCELLATION} ELSE s."cancelledAt" END`;
// NULL means access never ends.
const EFFECTIVE_ACCESS_END = `COALESCE(s."accessEndsAt", CASE WHEN s."cancelledAt" IS NULL THEN NULL ELSE ${LEGACY_ACCESS_END} END)`;

const IS_ACTIVE = `(s."startsAt" <= :now AND (${EFFECTIVE_ACCESS_END} IS NULL OR ${EFFECTIVE_ACCESS_END} > :now))`;
const WAS_EVER_ACTIVE = `(s."startsAt" <= :now AND (${EFFECTIVE_ACCESS_END} IS NULL OR ${EFFECTIVE_ACCESS_END} > s."startsAt"))`;

function subscriptionExists(
  queryBuilder: SelectQueryBuilder<OrgRecord>,
  condition?: string,
): string {
  const subQuery = queryBuilder
    .subQuery()
    .select('1')
    .from(SubscriptionRecord, 's')
    .where('s."orgId" = org.id');
  if (condition) subQuery.andWhere(condition);
  return `EXISTS ${subQuery.getQuery()}`;
}

function trialExists(queryBuilder: SelectQueryBuilder<OrgRecord>): string {
  const subQuery = queryBuilder
    .subQuery()
    .select('1')
    .from(TrialRecord, 't')
    .where('t."orgId" = org.id');
  return `EXISTS ${subQuery.getQuery()}`;
}

// First match wins: archived, paying, expired, trial, no-plan (AYC-1311).
export function orgLifecycleStatusSql(
  queryBuilder: SelectQueryBuilder<OrgRecord>,
): string {
  return `(CASE
    WHEN org.archived THEN 'archived'
    WHEN ${subscriptionExists(queryBuilder, IS_ACTIVE)} THEN 'paying'
    WHEN ${subscriptionExists(queryBuilder, WAS_EVER_ACTIVE)} THEN 'expired'
    WHEN ${trialExists(queryBuilder)} OR ${subscriptionExists(queryBuilder)} THEN 'trial'
    ELSE 'no-plan'
  END)`;
}
