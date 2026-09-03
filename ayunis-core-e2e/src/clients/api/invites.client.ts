import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';
import type { AcceptInviteDto } from '../generated/ayunisCoreAPI.schemas';
import { CreateInviteDtoRole } from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

export async function inviteUser(
  api: APIRequestContext,
  email: string,
  role: CreateInviteDtoRole = CreateInviteDtoRole.user,
): Promise<void> {
  await generatedApi.invitesControllerCreate({ email, role }, { api });
}

export function requestInvite(
  api: APIRequestContext,
  email: string,
  role: CreateInviteDtoRole = CreateInviteDtoRole.user,
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/invites`, {
    data: { email, role },
  });
}

export async function acceptInvite(
  api: APIRequestContext,
  input: AcceptInviteDto,
): Promise<void> {
  await generatedApi.invitesControllerAcceptInvite(input, { api });
}
