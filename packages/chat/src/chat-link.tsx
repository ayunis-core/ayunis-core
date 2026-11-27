import type { ComponentProps, MouseEvent } from 'react';
import type { ChatEvents, ChatNavigationTarget } from './chat-config';

type ChatLinkProps = Omit<ComponentProps<'a'>, 'href'> & {
  readonly to: ChatNavigationTarget;
  readonly events: Pick<ChatEvents, 'onNavigate' | 'hrefFor'>;
};

function opensElsewhere(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

/**
 * A link that leaves the chat. A plain click navigates through the host; a
 * modified click opens the host's address like any link.
 */
export function ChatLink({
  to,
  events,
  onClick,
  ...props
}: Readonly<ChatLinkProps>) {
  return (
    <a
      {...props}
      href={events.hrefFor?.(to)}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || opensElsewhere(event)) return;
        event.preventDefault();
        events.onNavigate?.(to);
      }}
    />
  );
}
