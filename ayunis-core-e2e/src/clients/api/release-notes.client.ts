import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';
import type { ReleaseNoteResponseDto } from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

export function getReleaseNote(
  api: APIRequestContext,
  releaseNoteId: string,
): Promise<ReleaseNoteResponseDto> {
  return generatedApi.releaseNotesControllerFindOne(releaseNoteId, { api });
}

export function requestReleaseNotes(
  api: APIRequestContext,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.get(`${apiURL}/api/release-notes`);
}

export function requestReleaseNoteImage(
  api: APIRequestContext,
  releaseNoteId: string,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/release-notes/${releaseNoteId}/image`);
}
