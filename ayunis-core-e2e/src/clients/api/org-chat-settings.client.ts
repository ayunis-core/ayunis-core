import type { APIRequestContext } from '@playwright/test';
import type { OrgChatSettingsResponseDto } from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

export async function getOrgChatSettings(
  api: APIRequestContext,
): Promise<OrgChatSettingsResponseDto> {
  return generatedApi.orgChatSettingsControllerGetOrgChatSettings({ api });
}
