import type { UpdatePermittedModelDto } from '@ayunis/api-client';

/** Overwrites only the switches the update names; omitted ones stay as they are. */
export function applyPolicyUpdate<
  T extends {
    anonymousOnly?: boolean | null;
    memoryAccess?: boolean | null;
    chatHistoryAccess?: boolean | null;
  },
>(model: T, update: UpdatePermittedModelDto): T {
  return {
    ...model,
    ...(update.anonymousOnly !== undefined && {
      anonymousOnly: update.anonymousOnly,
    }),
    ...(update.memoryAccess !== undefined && {
      memoryAccess: update.memoryAccess,
    }),
    ...(update.chatHistoryAccess !== undefined && {
      chatHistoryAccess: update.chatHistoryAccess,
    }),
  };
}
