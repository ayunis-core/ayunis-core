import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  SourceCitationProvider,
  type SourceCitation,
} from '@/widgets/markdown';
import SourceCitationDialog from './SourceCitationDialog';

interface SourceCitationControllerProps {
  readonly threadId: string;
  readonly children: ReactNode;
}

export default function SourceCitationController({
  threadId,
  children,
}: SourceCitationControllerProps) {
  const [selectedCitation, setSelectedCitation] =
    useState<SourceCitation | null>(null);

  return (
    <SourceCitationProvider onCitationClick={setSelectedCitation}>
      {children}
      {selectedCitation && (
        <SourceCitationDialog
          threadId={threadId}
          selectedCitation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
        />
      )}
    </SourceCitationProvider>
  );
}
