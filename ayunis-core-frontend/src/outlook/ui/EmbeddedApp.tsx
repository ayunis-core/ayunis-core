import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { App } from '@/app/App';
import { createAppQueryClient, createAppRouter } from '@/app/app-router';
import appI18n from '@/i18n';
import { startPaneItemChats } from '@/outlook/lib/pane-item-chats';

/** The chat app in embedded mode; one per sign-in, so a new account never sees the previous one's cache. */
export function EmbeddedApp({
  userId,
  onSignOut,
}: Readonly<{ userId: string; onSignOut: () => Promise<void> }>) {
  const [app] = useState(() => {
    const queryClient = createAppQueryClient();
    return { queryClient, router: createAppRouter(queryClient, true) };
  });
  useEffect(
    () => startPaneItemChats(app.router, app.queryClient, userId),
    [app, userId],
  );
  return (
    <I18nextProvider i18n={appI18n}>
      <App
        router={app.router}
        queryClient={app.queryClient}
        embedded
        onEmbeddedSignOut={onSignOut}
      />
    </I18nextProvider>
  );
}
