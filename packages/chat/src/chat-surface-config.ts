import type { ReactNode } from 'react';
import type { RunEndpoints } from './run-endpoints';

export interface ChatCapabilities {
  readonly fileUpload?: boolean;
  /** Adds a dedicated audio picker alongside the generic file picker. */
  readonly audio?: boolean;
  readonly voice?: boolean;
  readonly readAloud?: boolean;
  readonly skills?: boolean;
  readonly knowledgeBases?: boolean;
  readonly integrations?: boolean;
  readonly modelSelection?: boolean;
  readonly rename?: boolean;
  readonly delete?: boolean;
}

export interface ChatSurfaceConfig {
  readonly transport: RunEndpoints;
  readonly capabilities: ChatCapabilities;
}

export interface ChatSlots {
  readonly header?: (actions: ReactNode) => ReactNode;
  readonly actions?: ReactNode;
  readonly emptyState?: ReactNode;
  readonly onOpenArtifact?: (artifactId: string) => void;
}
