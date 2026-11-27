import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ayunis/ui/components/tabs';
import type { RecordingResponseDto } from '@ayunis/api-client/schemas';
import { useUploadRecordingAudio } from '@/features/recording-audio';
import { useRecordingSummary } from '@/pages/recording/api';
import {
  suggestSpeakerNames,
  unclearSpeakerNames,
} from '@/pages/recording/lib/summary-enhancements';
import { useSpeakerNames } from '@/pages/recording/model/useSpeakerNames';
import { RecordingSummaryCard } from './RecordingSummaryCard';
import { RecordingTranscriptCard } from './RecordingTranscriptCard';

export function RecordingTabs({
  recording,
  canManage,
  configuration,
  chat,
}: Readonly<{
  recording: RecordingResponseDto;
  canManage: boolean;
  configuration: ReactNode;
  chat: ReactNode;
}>) {
  const [tab, setTab] = useState('summary');
  const { t } = useTranslation('recordings');
  const tabsRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    tabsRef.current?.closest('.content-scroll-viewport')?.scrollTo({ top: 0 });
  }, [tab]);
  // Held above the tabs, so an upload's progress survives a tab switch.
  const audioUpload = useUploadRecordingAudio(recording.id);
  const { content: summary } = useRecordingSummary(
    recording.id,
    recording.summary?.status === 'ready',
  );
  const suggestions = useMemo(
    () => (summary ? suggestSpeakerNames(summary) : {}),
    [summary],
  );
  const unclear = useMemo(
    () => (summary ? unclearSpeakerNames(summary) : {}),
    [summary],
  );
  const speakers = useSpeakerNames(recording.id, suggestions);
  const [highlightedTurn, setHighlightedTurn] = useState<number | null>(null);
  const highlightTimer = useRef<number>(undefined);

  const showTurn = (turnIndex: number) => {
    setTab('transcript');
    setHighlightedTurn(turnIndex);
    window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(
      () => setHighlightedTurn(null),
      2500,
    );
  };

  return (
    <Tabs ref={tabsRef} value={tab} onValueChange={setTab} className="w-full">
      <TabsList data-testid="recording-tabs">
        <TabsTrigger value="summary" data-testid="recording-tab-summary">
          {t('detail.tabs.summary')}
        </TabsTrigger>
        <TabsTrigger value="transcript" data-testid="recording-tab-transcript">
          {t('detail.tabs.transcript')}
        </TabsTrigger>
        <TabsTrigger
          value="configuration"
          data-testid="recording-tab-configuration"
        >
          {t('detail.tabs.configuration')}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="summary">
        <RecordingSummaryCard
          recording={recording}
          canManage={canManage}
          audioUpload={audioUpload}
          speakers={speakers}
          onReviewSpeakers={() => setTab('transcript')}
          onShowTurn={showTurn}
        />
      </TabsContent>
      <TabsContent value="transcript">
        <RecordingTranscriptCard
          recording={recording}
          canManage={canManage}
          audioUpload={audioUpload}
          speakers={speakers}
          speakerHints={{
            edited: speakers.edited,
            recognized: suggestions,
            unclear,
          }}
          highlightedTurn={highlightedTurn}
        />
      </TabsContent>
      {/* Stays mounted, so an unsaved name survives a look at another tab. */}
      <TabsContent
        value="configuration"
        forceMount
        className="grid gap-4 data-[state=inactive]:hidden"
      >
        {configuration}
      </TabsContent>
      {tab === 'summary' ? <div className="mt-6">{chat}</div> : null}
    </Tabs>
  );
}
