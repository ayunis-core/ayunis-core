import { useAppAlertControllerGetAppAlert } from '@/shared/api';

export default function useAppAlert() {
  const { data, isLoading, isError } = useAppAlertControllerGetAppAlert();

  return {
    appAlert: data,
    isLoading,
    isError,
  };
}
