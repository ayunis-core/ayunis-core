import { useAppAlertControllerGetAppAlert } from '@ayunis/api-client';

export default function useAppAlert() {
  const { data, isLoading, isError } = useAppAlertControllerGetAppAlert();

  return {
    appAlert: data,
    isLoading,
    isError,
  };
}
