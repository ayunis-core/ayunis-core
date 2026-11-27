import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getReleaseNotesControllerFindInstantOpenQueryKey,
  useOnboardingControllerGetOnboarding,
  useReleaseNotesControllerFindInstantOpen,
} from '@ayunis/api-client/endpoints';
import type { ReleaseNoteResponseDto } from '@ayunis/api-client/schemas';
import { useIsFeatureEnabled } from '@/features/feature-toggles';
import {
  loadChatStarterDefaults,
  type ChatStarterDefaults,
} from '@/widgets/chat-starter';

export interface ReleaseNoteAnnouncement {
  releaseNote: ReleaseNoteResponseDto;
  chatStarterDefaults: ChatStarterDefaults;
}

/**
 * The product update to open right away, asked for once per sign-in and only
 * after the welcome video: an update synced during a session opens at the
 * next sign-in.
 */
export function useReleaseNoteAnnouncement(): ReleaseNoteAnnouncement | null {
  const queryClient = useQueryClient();
  const enabled = useIsFeatureEnabled('releaseNotesEnabled');
  const { data: onboarding, isError: onboardingFailed } =
    useOnboardingControllerGetOnboarding();
  // Without onboarding the welcome video does not show, so it is no reason to wait.
  const welcomeVideoSeen = onboarding
    ? Boolean(onboarding.welcomeVideoSeenAt)
    : onboardingFailed;
  const queryKey = getReleaseNotesControllerFindInstantOpenQueryKey();

  const { data } = useReleaseNotesControllerFindInstantOpen({
    query: {
      queryKey,
      enabled: enabled && welcomeVideoSeen,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    },
  });
  const releaseNote = data?.releaseNote ?? null;

  const { data: chatStarterDefaults } = useQuery({
    queryKey: [...queryKey, 'chat-starter-defaults'],
    queryFn: () => loadChatStarterDefaults(queryClient),
    enabled: releaseNote !== null,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return releaseNote && chatStarterDefaults
    ? { releaseNote, chatStarterDefaults }
    : null;
}
