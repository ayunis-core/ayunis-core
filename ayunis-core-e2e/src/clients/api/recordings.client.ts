import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';
import type {
  CreateRecordingDto,
  CreateSourceUploadDto,
  RecordingResponseDto,
  RecordingTranscriptTurnDto,
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

export interface AudioFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

/** The browser's direct upload: reserve, PUT to storage, complete. */
export async function uploadRecordingAudio(
  api: APIRequestContext,
  recordingId: string,
  file: AudioFile,
): Promise<RecordingResponseDto> {
  const session = await generatedApi.recordingUploadsControllerCreateUpload(
    recordingId,
    {
      fileName: file.name,
      mimeType: file.mimeType,
      fileSize: file.buffer.length,
    },
    { api },
  );
  const signed = await generatedApi.sourceUploadsControllerSign(
    session.id,
    { method: 'PUT' },
    { api },
  );
  const stored = await api.put(signed.url, { data: file.buffer });
  if (!stored.ok()) {
    throw new Error(`Storing the recording answered ${stored.status()}`);
  }
  return generatedApi.recordingUploadsControllerCompleteUpload(
    recordingId,
    session.id,
    { api },
  );
}

export async function getRecordingTranscript(
  api: APIRequestContext,
  recordingId: string,
): Promise<RecordingTranscriptTurnDto[]> {
  const { turns } = await generatedApi.recordingsControllerTranscript(
    recordingId,
    { api },
  );
  return turns;
}

export function requestRecordingUpload(
  api: APIRequestContext,
  recordingId: string,
  upload: CreateSourceUploadDto,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.post(`${apiURL}/api/recordings/${recordingId}/uploads`, {
    data: upload,
  });
}

export function requestRecordingTranscript(
  api: APIRequestContext,
  recordingId: string,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.get(`${apiURL}/api/recordings/${recordingId}/transcript`);
}
