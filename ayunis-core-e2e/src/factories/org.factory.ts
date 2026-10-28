import { request as apiRequest } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { config } from '../config';
import {
  confirmEmail,
  isLoggedIn,
  login,
  registerOrg,
} from '../clients/api/auth.client';
import { skipChatPersonalization } from '../clients/api/chat-settings.client';
import { permitFirstLanguageModelAsDefault } from '../clients/api/models.client';
import type { DefaultModel } from '../clients/api/models.client';
import { dismissWelcomeVideo } from '../clients/api/onboarding.client';
import { MailcatcherClient } from '../clients/mailcatcher.client';
import { generatedApi } from '../clients/api/generated-api';

export interface OrgAdmin {
  email: string;
  password: string;
  name: string;
}

export interface OrgContext {
  orgId: string;
  orgName: string;
  admin: OrgAdmin;
  storageState: string;
  defaultModel: DefaultModel;
}

async function confirmEmailIfRequired(
  api: APIRequestContext,
  admin: OrgAdmin,
): Promise<void> {
  if (await isLoggedIn(api)) return;

  const mail = new MailcatcherClient(api, config.mailURL);
  const token = await mail.extractLinkToken(admin.email, '/confirm-email');
  await confirmEmail(api, token);
  await login(api, admin.email, admin.password);
}

export async function createOrg(
  uniqueKey: string,
  storageStatePath: string,
): Promise<OrgContext> {
  const admin: OrgAdmin = {
    email: `e2e-admin-${uniqueKey}@e2e.local`,
    password: 'E2e-Password-1',
    name: `E2E Admin ${uniqueKey}`,
  };
  const orgName = `E2E Org ${uniqueKey}`;

  const api = await apiRequest.newContext({ baseURL: config.apiURL });
  try {
    await registerOrg(api, {
      email: admin.email,
      password: admin.password,
      orgName,
      userName: admin.name,
    });
    await confirmEmailIfRequired(api, admin);
    const defaultModel = await permitFirstLanguageModelAsDefault(api);
    await dismissWelcomeVideo(api);
    await skipChatPersonalization(api);
    const currentUser = await generatedApi.authenticationControllerMe({ api });
    await api.storageState({ path: storageStatePath });
    return {
      orgId: currentUser.orgId,
      orgName,
      admin,
      storageState: storageStatePath,
      defaultModel,
    };
  } finally {
    await api.dispose();
  }
}
