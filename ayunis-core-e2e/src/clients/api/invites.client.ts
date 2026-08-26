import type { APIRequestContext } from '@playwright/test';
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

export async function acceptInvite(
  api: APIRequestContext,
  input: AcceptInviteDto,
): Promise<void> {
  await generatedApi.invitesControllerAcceptInvite(input, { api });
}
