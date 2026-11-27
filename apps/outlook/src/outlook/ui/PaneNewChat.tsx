import { useRef, useState, type ReactNode } from 'react';
import {
  NewChatComposer,
  type ChatConfig,
  type NewChatComposerHandle,
  type NewChatStart,
} from '@ayunis/chat/surface';
import type { useStartPaneThread } from '@/outlook/lib/use-start-pane-thread';
import { PaneAcademyNotice } from '@/outlook/ui/PaneAcademyNotice';
import { PaneNewChatLayout } from '@/outlook/ui/PaneNewChatLayout';

type PaneNewChatProps = Readonly<{
  draftKey: string;
  header: ReactNode;
  config: Pick<ChatConfig, 'layout' | 'drafts'>;
  startAttempt: ReturnType<typeof useStartPaneThread>;
  isAcademyGated: boolean;
}>;

export function PaneNewChat(props: PaneNewChatProps) {
  const { draftKey, startAttempt } = props;
  const composerRef = useRef<NewChatComposerHandle>(null);
  const [canStart, setCanStart] = useState(false);
  function start(input: NewChatStart, accepted: () => void) {
    void startAttempt.start(
      { ...input, files: input.sources.map(({ file }) => file) },
      accepted,
    );
  }
  return (
    <PaneNewChatLayout
      header={props.header}
      busy={startAttempt.busy}
      waiting={startAttempt.busy || !canStart}
      onStarter={(text) => composerRef.current?.sendMessage(text)}
      composer={
        <>
          {props.isAcademyGated && <PaneAcademyNotice />}
          <NewChatComposer
            ref={composerRef}
            config={props.config}
            draftKey={draftKey}
            busy={startAttempt.busy}
            onStart={start}
            onStop={() => startAttempt.stop()}
            onSelectionChange={(selection) => setCanStart(selection.canStart)}
          />
        </>
      }
    />
  );
}
