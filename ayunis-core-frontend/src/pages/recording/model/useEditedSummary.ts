import { useState } from 'react';

const storageKey = (recordingId: string) =>
  `recording-summary-edit:${recordingId}`;

function readEdit(recordingId: string): string | null {
  try {
    return localStorage.getItem(storageKey(recordingId));
  } catch {
    return null;
  }
}

export function useEditedSummary(recordingId: string): {
  edited: string | null;
  save: (summary: string) => void;
} {
  const [edited, setEdited] = useState(() => readEdit(recordingId));

  const save = (summary: string) => {
    setEdited(summary);
    try {
      localStorage.setItem(storageKey(recordingId), summary);
    } catch {
      return;
    }
  };

  return { edited, save };
}
