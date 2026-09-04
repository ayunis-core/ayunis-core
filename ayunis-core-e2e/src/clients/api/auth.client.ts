import type { APIRequestContext, APIResponse } from '@playwright/test';
import type {
  MeResponseDto,
  SsoDiscoveryResponseDto,
} from '../generated/ayunisCoreAPI.schemas';
import { config } from '../../config';
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
  await generatedApi.authenticationControllerLogin(
    { email, password },
    { api },
  );
}

export function submitLoginAttempt(
  api: APIRequestContext,
  email: string,
  password: string,
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/auth/login`, {
    data: { email, password },
  });
}

export async function getAuthenticatedPrincipalId(
  api: APIRequestContext,
): Promise<string> {
  return (await generatedApi.authenticationControllerMe({ api })).id;
}

export async function isLoggedIn(api: APIRequestContext): Promise<boolean> {
  try {
    await generatedApi.authenticationControllerMe({ api });
    return true;
  } catch {
    return false;
  }
}

export function getCurrentUser(api: APIRequestContext): Promise<MeResponseDto> {
  return generatedApi.authenticationControllerMe({ api });
}

export async function refreshSession(api: APIRequestContext): Promise<void> {
  await generatedApi.authenticationControllerRefresh({ api });
}

export async function markWelcomeVideoSeen(
  api: APIRequestContext,
): Promise<void> {
  await generatedApi.onboardingControllerMarkWelcomeVideoSeen({ api });
}

export function discoverSso(
  api: APIRequestContext,
  email: string,
): Promise<SsoDiscoveryResponseDto> {
  return generatedApi.ssoLoginControllerDiscover({ email }, { api });
}

export async function confirmEmail(
  api: APIRequestContext,
  token: string,
): Promise<void> {
  await generatedApi.userControllerConfirmEmail({ token }, { api });
}
