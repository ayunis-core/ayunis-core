import type { APIRequestContext } from '@playwright/test';
import { totpCode } from '../totp';
import { generatedApi } from './generated-api';

/** Enrolls the signed-in user in TOTP and returns its recovery codes. */
export async function enableTotp(api: APIRequestContext): Promise<string[]> {
  const { secret } = await generatedApi.mfaControllerSetup({ api });
  const { recoveryCodes } = await generatedApi.mfaControllerConfirm(
    { code: totpCode(secret) },
    { api },
  );
  return recoveryCodes;
}
