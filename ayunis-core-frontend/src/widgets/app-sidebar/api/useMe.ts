import { useAuthenticationControllerMe } from '@ayunis/api-client';

export const useMe = () => {
  const { data, isLoading, error } = useAuthenticationControllerMe();
  return {
    user: data,
    isLoading,
    error,
  };
};
