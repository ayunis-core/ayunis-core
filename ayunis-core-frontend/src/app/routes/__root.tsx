import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { ChatContextProvider } from '@/shared/contexts/chat/ChatContextProvider';
import type { QueryClient } from '@tanstack/react-query';
import { Toaster } from '@/shared/ui/shadcn/sonner';
import type { MeResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  ConfirmationProvider,
  ConfirmationModal,
} from '@/widgets/confirmation-modal';
import { getTheme, setTheme } from '@/features/theme';

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  user: MeResponseDto | null;
}>()({
  beforeLoad: () => {
    const theme = getTheme();
    setTheme(theme);
  },
  component: () => (
    <>
      <ConfirmationProvider>
        <ChatContextProvider>
          <Outlet />
          <ConfirmationModal />
          <Toaster />
        </ChatContextProvider>
      </ConfirmationProvider>
    </>
  ),
});
