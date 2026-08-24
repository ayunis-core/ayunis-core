import type { APIRequestContext } from '@playwright/test';
import { submitLoginAttempt } from '../clients/api/auth.client';

const DEFAULT_MAX_ATTEMPTS = 10;

export async function lockUserAccount(
  api: APIRequestContext,
  email: string,
): Promise<void> {
  for (let attempt = 0; attempt < DEFAULT_MAX_ATTEMPTS; attempt += 1) {
    const response = await submitLoginAttempt(api, email, 'wrong-password');
    if (response.status() !== 401) {
      throw new Error(`Failed login returned HTTP ${response.status()}`);
    }
  }
}
