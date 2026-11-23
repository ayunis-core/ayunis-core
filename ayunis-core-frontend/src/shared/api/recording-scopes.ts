import type { RecordingsControllerFindAllParams } from '@ayunis/api-client/schemas';

export const personalRecordingListParams = {
  ownerType: 'personal',
} as const satisfies RecordingsControllerFindAllParams;

export function workspaceRecordingListParams(
  workspaceId: string,
): RecordingsControllerFindAllParams {
  return { ownerType: 'workspace', workspaceId };
}
