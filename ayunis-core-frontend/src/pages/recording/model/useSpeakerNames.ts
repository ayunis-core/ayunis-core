import { useState } from 'react';

export type SpeakerNames = Partial<Record<number, string>>;

const storageKey = (recordingId: string) =>
  `recording-speaker-names:${recordingId}`;

function readNames(recordingId: string): SpeakerNames {
  try {
    const stored = localStorage.getItem(storageKey(recordingId));
    return stored ? (JSON.parse(stored) as SpeakerNames) : {};
  } catch {
    return {};
  }
}

export function useSpeakerNames(
  recordingId: string,
  suggestions: SpeakerNames,
) {
  const [edited, setEdited] = useState(() => readNames(recordingId));

  const rename = (speakerNumber: number, name: string) => {
    const next = { ...edited, [speakerNumber]: name };
    setEdited(next);
    try {
      localStorage.setItem(storageKey(recordingId), JSON.stringify(next));
    } catch {
      return;
    }
  };

  return {
    names: { ...suggestions, ...edited } as SpeakerNames,
    edited,
    rename,
  };
}

export type SpeakerNamesState = ReturnType<typeof useSpeakerNames>;
