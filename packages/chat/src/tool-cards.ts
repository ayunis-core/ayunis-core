import type { ToolUseMessageContentResponseDto } from '@ayunis/api-client/schemas';
import type { ComponentType } from 'react';

export interface ToolCardProps {
  readonly toolUse: ToolUseMessageContentResponseDto;
  readonly result?: string;
  readonly isStreaming: boolean;
  readonly threadId?: string;
  readonly onOpenArtifact?: (artifactId: string) => void;
  readonly index: number;
}

export interface ToolAction {
  readonly labelKey: string;
  readonly targetParams?: readonly string[];
  readonly listTargetParam?: string;
}

export interface ToolCardRegistration<ArtifactFamily extends string = string> {
  readonly render: ComponentType<ToolCardProps>;
  readonly action?: ToolAction;
  readonly createsArtifact?: boolean;
  readonly artifactFamily?: ArtifactFamily;
}

export function createToolCardRegistry<ArtifactFamily extends string = string>(
  registrations: Readonly<Record<string, ToolCardRegistration<ArtifactFamily>>>,
): ReadonlyMap<string, ToolCardRegistration<ArtifactFamily>> {
  return new Map(Object.entries(registrations));
}
