import type { ReactNode } from 'react';

export interface ChatSlots {
  readonly header?: (actions: ReactNode) => ReactNode;
  readonly actions?: ReactNode;
  readonly emptyState?: ReactNode;
  readonly onOpenArtifact?: (artifactId: string) => void;
}
