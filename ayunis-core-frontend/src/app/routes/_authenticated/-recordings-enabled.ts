import type { QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { getFeatureToggles } from './-routines-enabled-query';

export async function requireRecordingsEnabled(
  queryClient: QueryClient,
): Promise<void> {
  const { recordingsEnabled } = await getFeatureToggles(queryClient);
  if (!recordingsEnabled) throw redirect({ to: '/chat' });
}
