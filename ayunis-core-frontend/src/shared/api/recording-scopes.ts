import type { RecordingsControllerFindAllParams } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export const personalRecordingListParams = {
  ownerType: 'personal',
} as const satisfies RecordingsControllerFindAllParams;

export function workspaceRecordingListParams(
  workspaceId: string,
): RecordingsControllerFindAllParams {
  return { ownerType: 'workspace', workspaceId };
}
