import { ChatSurface, type ChatSurfaceProps } from '@ayunis/chat/surface';
import type { ReactNode } from 'react';
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from 'react-resizable-panels';

interface ChatInterfaceLayoutProps extends ChatSurfaceProps {
  readonly sidePanel?: ReactNode;
}

export default function ChatInterfaceLayout({
  sidePanel,
  ...chat
}: ChatInterfaceLayoutProps) {
  return (
    <PanelGroup orientation="horizontal" className="absolute inset-0">
      <Panel defaultSize={sidePanel ? 50 : 100} minSize={30}>
        <ChatSurface {...chat} />
      </Panel>
      {sidePanel && (
        <>
          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors" />
          <Panel defaultSize={50} minSize={30}>
            {sidePanel}
          </Panel>
        </>
      )}
    </PanelGroup>
  );
}
