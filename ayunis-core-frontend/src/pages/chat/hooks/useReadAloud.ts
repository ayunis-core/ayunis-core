import { useEffect, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/features/language';
import {
  MAX_SPEECH_TEXT_LENGTH,
  requestSpeech,
} from '@/pages/chat/api/requestSpeech';
import {
  readAloudPlayer,
  type ReadAloudStatus,
} from '@/pages/chat/lib/read-aloud-player';
import { showError } from '@/shared/lib/toast';

export function useReadAloud(messageKey: string): {
  status: ReadAloudStatus;
  toggle: (readText: () => string) => void;
} {
  const { t } = useTranslation('chat');
  const { language } = useLanguage();
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
      .catch(() => showError(t('chat.readAloudError')));
  };

  return { status, toggle };
}
