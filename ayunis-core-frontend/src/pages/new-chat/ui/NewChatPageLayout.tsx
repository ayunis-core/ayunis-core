import type { ChatSlots } from '@ayunis/chat/surface';
import {
  NewChatShell,
  type NewChatShellPhase,
  type NewChatShellProps,
} from '@ayunis/chat/new-chat';
import AppLayout from '@/layouts/app-layout';

export type NewChatMistPhase = NewChatShellPhase;

interface NewChatPageLayoutProps extends Omit<
  NewChatShellProps,
  'header' | 'emptyState' | 'layout' | 'testId'
> {
  slots: Pick<ChatSlots, 'header' | 'actions' | 'emptyState'>;
}

export default function NewChatPageLayout({
  slots,
  ...shellProps
}: Readonly<NewChatPageLayoutProps>) {
  const header = slots.header ? slots.header(slots.actions) : slots.actions;
  return (
    <AppLayout>
      <NewChatShell
        {...shellProps}
        header={header}
        emptyState={slots.emptyState}
      />
    </AppLayout>
  );
}
