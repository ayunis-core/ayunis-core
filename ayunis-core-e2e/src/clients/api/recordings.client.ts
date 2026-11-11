import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';
import type {
  CreateRecordingDto,
  RecordingResponseDto,
  RecordingTransferOwnerDto,
} from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

export function createRecording(
  api: APIRequestContext,
  recording: CreateRecordingDto,
): Promise<RecordingResponseDto> {
  return generatedApi.recordingsControllerCreate(recording, { api });
}

export function getRecording(
  api: APIRequestContext,
  recordingId: string,
): Promise<RecordingResponseDto> {
  return generatedApi.recordingsControllerFindOne(recordingId, { api });
}

export async function listRecordingIds(
  api: APIRequestContext,
): Promise<string[]> {
  const { data } = await generatedApi.recordingsControllerFindAll(
    { ownerType: 'personal' },
    { api },
  );
  return data.map(({ id }) => id);
}

export function changeRecordingOwner(
  api: APIRequestContext,
  recordingId: string,
  owner: RecordingTransferOwnerDto,
): Promise<RecordingResponseDto> {
  return generatedApi.recordingsControllerChangeOwner(recordingId, owner, {
    api,
  });
}

// Raw requests for asserting the status of calls that may be denied; `apiURL`
// targets another backend (e.g. the one started with recordings disabled).
export function requestRecordings(
  api: APIRequestContext,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.get(`${apiURL}/api/recordings`, {
    params: { ownerType: 'personal' },
  });
}

export function requestRecording(
  api: APIRequestContext,
  recordingId: string,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.get(`${apiURL}/api/recordings/${recordingId}`);
}

export function requestRecordingCreation(
  api: APIRequestContext,
  recording: CreateRecordingDto,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.post(`${apiURL}/api/recordings`, { data: recording });
}

export function requestRecordingRename(
  api: APIRequestContext,
  recordingId: string,
  name: string,
): Promise<APIResponse> {
  return api.patch(`${config.apiURL}/api/recordings/${recordingId}`, {
    data: { name },
  });
}

export function requestRecordingOwnerChange(
  api: APIRequestContext,
  recordingId: string,
  owner: RecordingTransferOwnerDto,
): Promise<APIResponse> {
  return api.patch(`${config.apiURL}/api/recordings/${recordingId}/owner`, {
    data: owner,
  });
}

export function requestRecordingDeletion(
  api: APIRequestContext,
  recordingId: string,
): Promise<APIResponse> {
  return api.delete(`${config.apiURL}/api/recordings/${recordingId}`);
}
