import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';
import type {
  PaginatedUsersListResponseDto,
  UserResponseDto,
} from '../generated/ayunisCoreAPI.schemas';

export async function findUserByEmail(
  api: APIRequestContext,
  email: string,
): Promise<UserResponseDto | undefined> {
  const response = await requestUsersByEmail(api, email);
  if (!response.ok()) {
    throw new Error(`Failed to search users (HTTP ${response.status()})`);
  }
  const users = (await response.json()) as PaginatedUsersListResponseDto;
  return users.data.find((candidate) => candidate.email === email);
}

export function requestUsersByEmail(
  api: APIRequestContext,
  email: string,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/users`, {
    params: { search: email },
  });
}

export function requestAdminUnlockUserAccount(
  api: APIRequestContext,
  userId: string,
): Promise<APIResponse> {
  return api.patch(`${config.apiURL}/api/users/${userId}/unlock`);
}

export function requestSuperAdminUnlockUserAccount(
  api: APIRequestContext,
  userId: string,
): Promise<APIResponse> {
  return api.patch(`${config.apiURL}/api/super-admin/users/${userId}/unlock`);
}
