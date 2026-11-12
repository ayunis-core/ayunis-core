import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ayunis/ui/components/tabs';
import type { RecordingResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useUploadRecordingAudio } from '@/features/recording-audio';
import { RecordingSummaryCard } from './RecordingSummaryCard';
import { RecordingTranscriptCard } from './RecordingTranscriptCard';

export function RecordingTabs({
  recording,
  canManage,
  configuration,
}: Readonly<{
  recording: RecordingResponseDto;
  canManage: boolean;
  configuration: ReactNode;
}>) {
  const { t } = useTranslation('recordings');
  // Held above the tabs, so an upload's progress survives a tab switch.
  const audioUpload = useUploadRecordingAudio(recording.id);

  return (
    <Tabs defaultValue="transcript" className="w-full">
      <TabsList data-testid="recording-tabs">
        <TabsTrigger value="transcript" data-testid="recording-tab-transcript">
          {t('detail.tabs.transcript')}
        </TabsTrigger>
        <TabsTrigger value="summary" data-testid="recording-tab-summary">
          {t('detail.tabs.summary')}
        </TabsTrigger>
        <TabsTrigger
          value="configuration"
          data-testid="recording-tab-configuration"
        >
          {t('detail.tabs.configuration')}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="transcript">
        <RecordingTranscriptCard
          recording={recording}
          canManage={canManage}
          audioUpload={audioUpload}
        />
      </TabsContent>
      <TabsContent value="summary">
        <RecordingSummaryCard
          recording={recording}
          canManage={canManage}
          audioUpload={audioUpload}
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
    </Tabs>
  );
}
