import type { ReactNode } from 'react';

interface ChatInputToolbarProps {
  leading: ReactNode;
  modelSelector: ReactNode;
  trailing: ReactNode;
}

export function ChatInputToolbar({
  leading,
  modelSelector,
  trailing,
}: Readonly<ChatInputToolbarProps>) {
  return (
    <div
      data-testid="chat-input-toolbar"
      className="flex min-w-0 items-center gap-1 sm:gap-2"
    >
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">{leading}</div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
        <div className="min-w-0 flex-1 sm:flex-initial">{modelSelector}</div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {trailing}
        </div>
      </div>
    </div>
  );
}
