import { z } from 'zod';

const orgIdSchema = z.string().uuid();
const pendingOrgIdKey = 'ayunis.sso.pendingOrgId';
const rememberedOrgIdKey = 'ayunis.sso.rememberedOrgId';

export function rememberSsoAttempt(orgId: string): void {
  withSessionStorage((storage) => {
    if (orgIdSchema.safeParse(orgId).success) {
      storage.setItem(pendingOrgIdKey, orgId);
    } else {
      storage.removeItem(pendingOrgIdKey);
    }
  }, undefined);
}

export function rememberSuccessfulSsoLogin(): void {
  withSessionStorage((storage) => {
    const result = orgIdSchema.safeParse(storage.getItem(pendingOrgIdKey));
    storage.removeItem(pendingOrgIdKey);
    if (result.success) {
      storage.setItem(rememberedOrgIdKey, result.data);
    }
  }, undefined);
}

export function getRememberedSsoOrgId(): string | null {
  return withSessionStorage((storage) => {
    const result = orgIdSchema.safeParse(storage.getItem(rememberedOrgIdKey));
    if (result.success) return result.data;
    storage.removeItem(rememberedOrgIdKey);
    return null;
  }, null);
}

export function forgetRememberedSsoOrgId(): void {
  withSessionStorage((storage) => {
    storage.removeItem(pendingOrgIdKey);
    storage.removeItem(rememberedOrgIdKey);
  }, undefined);
}

function withSessionStorage<T>(
  operation: (storage: Storage) => T,
  fallback: T,
): T {
  try {
    return operation(window.sessionStorage);
  } catch {
    return fallback;
  }
}
