import { request as apiRequest } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { config } from '../../config';
import { generatedApi } from './generated-api';
import { login } from './auth.client';

export async function enableAcademyForOrg(orgId: string): Promise<void> {
  const superAdminApi = await apiRequest.newContext({ baseURL: config.apiURL });
  try {
    await login(superAdminApi, 'admin@demo.local', 'admin');
    await generatedApi.superAdminAddonsControllerActivate(
      orgId,
      'ayunis_core_academy',
      { api: superAdminApi },
    );
  } finally {
    await superAdminApi.dispose();
  }
}

export async function setAcademyMinimumModuleSeconds(
  seconds: number,
): Promise<void> {
  const superAdminApi = await apiRequest.newContext({ baseURL: config.apiURL });
  try {
    await login(superAdminApi, 'admin@demo.local', 'admin');
    await generatedApi.superAdminPlatformConfigControllerSetAcademyMinimumModuleSeconds(
      { seconds },
      { api: superAdminApi },
    );
  } finally {
    await superAdminApi.dispose();
  }
}

export async function confirmAcademyChapter(
  api: APIRequestContext,
  chapterId: string,
) {
  return generatedApi.academyChaptersControllerConfirmChapter(chapterId, {
    api,
  });
}

export async function requireAcademyCompletion(
  api: APIRequestContext,
): Promise<void> {
  await generatedApi.academyAccessControllerUpsertOrgSettings(
    { mode: 'required_once' },
    { api },
  );
}

export async function stopRequiringAcademyCompletion(
  api: APIRequestContext,
): Promise<void> {
  await generatedApi.academyAccessControllerUpsertOrgSettings(
    { mode: 'unrestricted' },
    { api },
  );
}

export async function getAcademyChapters(api: APIRequestContext) {
  return generatedApi.academyChaptersControllerGetChapters({ api });
}

export async function getAcademyChapterWithModules(api: APIRequestContext) {
  const chapter = (await getAcademyChapters(api)).find(
    ({ courseModules }) => courseModules.length > 0,
  );
  if (!chapter) throw new Error('Seed must contain a chapter with modules');
  return chapter;
}

export async function getAcademyProgress(api: APIRequestContext) {
  return generatedApi.academyProgressControllerGetProgress({ api });
}

export async function getAcademyAccessStatus(api: APIRequestContext) {
  return generatedApi.academyAccessControllerGetStatus({ api });
}
