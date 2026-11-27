import { useEffect, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@ayunis/ui/lib/toast';
import { MAX_SPEECH_TEXT_LENGTH, requestSpeech } from './request-speech';
import { readAloudPlayer, type ReadAloudStatus } from './read-aloud-player';

function speechLanguage(language: string): 'de' | 'en' {
  return language === 'de' ? 'de' : 'en';
}

export function useReadAloud(messageKey: string): {
  status: ReadAloudStatus;
  toggle: (readText: () => string) => void;
} {
  const { t, i18n } = useTranslation('chat');
  const language = speechLanguage(i18n.language);
  // Short answers are read in the UI language, so their audio differs by it.
  const cacheKey = `${messageKey}:${language}`;
  const state = useSyncExternalStore(
    readAloudPlayer.subscribe,
    readAloudPlayer.getState,
  );
  const status = state.key === cacheKey ? state.status : 'idle';

  useEffect(
    () => () => {
      if (readAloudPlayer.getState().key === cacheKey) readAloudPlayer.stop();
    },
    [cacheKey],
  );

  const toggle = (readText: () => string) => {
    if (status !== 'idle') {
      readAloudPlayer.stop();
      return;
    }
    const text = readText().slice(0, MAX_SPEECH_TEXT_LENGTH);
    if (!text.trim()) return;
    readAloudPlayer
      .play(cacheKey, (signal) => requestSpeech({ text, language }, signal))
      .catch(() =>
        toast.error(t('chat.readAloudError'), {
          position: 'bottom-center',
          closeButton: true,
        }),
      );
  };

  return { status, toggle };
}
