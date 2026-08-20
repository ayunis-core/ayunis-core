import {
  SourceResponseDtoStatus,
  type WorkspaceContextResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function hasProcessingWorkspaceDocuments(
  context: WorkspaceContextResponseDto | undefined,
): boolean {
  return (
    context?.documents.some(
      (document) => document.status === SourceResponseDtoStatus.processing,
    ) ?? false
  );
}
