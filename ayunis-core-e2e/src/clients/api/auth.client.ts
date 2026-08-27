import type { APIRequestContext } from '@playwright/test';
import { generatedApi } from './generated-api';

export interface RegisterOrgInput {
  email: string;
  password: string;
  orgName: string;
  userName: string;
}

export async function registerOrg(
  api: APIRequestContext,
  input: RegisterOrgInput,
): Promise<void> {
  await generatedApi.authenticationControllerRegister(
    {
      ...input,
      marketingAcceptance: false,
    },
    { api },
  );
}

export async function login(
  api: APIRequestContext,
  email: string,
  password: string,
): Promise<void> {
  await generatedApi.authenticationControllerLogin({ email, password }, { api });
}

export async function isLoggedIn(api: APIRequestContext): Promise<boolean> {
  try {
    await generatedApi.authenticationControllerMe({ api });
    return true;
  } catch {
    return false;
  }
}

export async function markWelcomeVideoSeen(
  api: APIRequestContext,
): Promise<void> {
  await generatedApi.onboardingControllerMarkWelcomeVideoSeen({ api });
}

export async function confirmEmail(
  api: APIRequestContext,
  token: string,
): Promise<void> {
  await generatedApi.userControllerConfirmEmail({ token }, { api });
}
