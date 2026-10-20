import { AsyncLocalStorage } from 'node:async_hooks';
import type { FynnCustomerLink } from 'src/integrations/fynn/application/ports/fynn-client';

export const fynnSweepContext = new AsyncLocalStorage<{
  customers?: Promise<FynnCustomerLink[]>;
  index?: {
    source: FynnCustomerLink[];
    byOrg: Map<string, FynnCustomerLink[]>;
  };
}>();
export const fynnReadDeadline = new AsyncLocalStorage<number>();

export function withFynnReadDeadline<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return fynnReadDeadline.getStore() !== undefined
    ? operation()
    : fynnReadDeadline.run(Date.now() + 45_000, operation);
}

export function fynnCustomersForOrg(
  customers: FynnCustomerLink[],
  orgId: string,
): FynnCustomerLink[] {
  const sweep = fynnSweepContext.getStore();
  if (sweep?.index?.source === customers)
    return sweep.index.byOrg.get(orgId) ?? [];
  const byOrg = indexFynnCustomers(customers);
  if (sweep) sweep.index = { source: customers, byOrg };
  return byOrg.get(orgId) ?? [];
}

function indexFynnCustomers(customers: FynnCustomerLink[]) {
  const byOrg = new Map<string, FynnCustomerLink[]>();
  for (const customer of customers) {
    if (Array.isArray(customer.customFields)) continue;
    const value = customer.customFields['ayunis-core-uuid'];
    if (typeof value !== 'string') continue;
    const key = value.toLowerCase();
    const matches = byOrg.get(key) ?? [];
    matches.push(customer);
    byOrg.set(key, matches);
  }
  return byOrg;
}
