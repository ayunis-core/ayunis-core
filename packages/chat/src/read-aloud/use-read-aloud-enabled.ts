import { useAppControllerFeatureToggles } from '@ayunis/api-client/endpoints';

/** Read aloud follows the instance's toggle; off until the toggles load. */
export function useReadAloudEnabled(): boolean {
  const toggles = useAppControllerFeatureToggles();
  return !toggles.error && toggles.data?.readAloudEnabled === true;
}
