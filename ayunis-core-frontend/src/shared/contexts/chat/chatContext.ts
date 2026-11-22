import type { ArtifactResponseDtoType } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type KnowledgeBaseSummary = {
  id: string;
  name: string;
};

export type IntegrationSummary = {
  id: string;
  name: string;
  logoUrl?: string | null;
};

export type ArtifactSummary = {
  id: string;
  /** As the user sees it, with an anonymous artifact's real values. */
  title: string;
  type: ArtifactResponseDtoType;
};

/** Where a chat takes its artifacts from, and which of them. */
export type ArtifactScope = {
  /** The chat's workspace; the user's personal artifacts when null. */
  workspaceId: string | null;
  isAnonymous: boolean;
};
