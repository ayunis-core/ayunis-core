import type { ReactNode } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ayunis/ui/components/tabs';
import type {
  MyTeamResponseDto,
  ShareResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import SharesTab from './SharesTab';

/** A detail page's configuration next to its shares, for shareable items. */
export function ConfigurationTabs({
  value,
  onValueChange,
  labels,
  configuration,
  entityType,
  entityId,
  shares,
  userTeams,
}: Readonly<{
  value: 'config' | 'share';
  onValueChange: (value: string) => void;
  labels: { configuration: string; shares: string };
  configuration: ReactNode;
  entityType: 'skill' | 'knowledge_base';
  entityId: string;
  shares: ShareResponseDto[];
  userTeams: MyTeamResponseDto[];
}>) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full">
      <TabsList>
        <TabsTrigger value="config">{labels.configuration}</TabsTrigger>
        <TabsTrigger value="share">{labels.shares}</TabsTrigger>
      </TabsList>
      <TabsContent value="config" className="mt-4">
        {configuration}
      </TabsContent>
      <TabsContent value="share" className="mt-4">
        <SharesTab
          entityType={entityType}
          entityId={entityId}
          shares={shares}
          userTeams={userTeams}
        />
      </TabsContent>
    </Tabs>
  );
}
