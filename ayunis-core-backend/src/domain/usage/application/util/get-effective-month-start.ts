// Start of the current credit window: first of the calendar month (UTC), or
// the subscription `since` anchor when it falls later. Shared by all monthly
// credit-usage lookups so they align with the org credit budget.
export function getEffectiveMonthStart(since?: Date): Date {
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  return since && since > monthStart ? since : monthStart;
}
