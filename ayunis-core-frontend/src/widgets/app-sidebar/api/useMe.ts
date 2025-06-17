import { useAuthenticationControllerMe } from "@/shared/api";

export const useMe = () => {
  const { data, isLoading, error } = useAuthenticationControllerMe();
  return {
    user: data,
    isLoading,
    error,
  };
};
