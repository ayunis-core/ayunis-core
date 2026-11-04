import type { ReactNode } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ayunis/ui/components/tabs';

export type OwnItemTab = 'config' | 'share';

export function OwnItemTabs({
  initialTab = 'config',
  config,
  share,
}: Readonly<{
  initialTab?: OwnItemTab;
  config: ReactNode;
  share: ReactNode;
}>) {
  return (
    <Tabs defaultValue={initialTab} className="w-full">
      <TabsList>
        <TabsTrigger value="config">Konfiguration</TabsTrigger>
        <TabsTrigger value="share">Freigaben</TabsTrigger>
      </TabsList>
      <TabsContent value="config" className="mt-4 space-y-6">
        {config}
      </TabsContent>
      <TabsContent value="share" className="mt-4">
        {share}
      </TabsContent>
    </Tabs>
  );
}
