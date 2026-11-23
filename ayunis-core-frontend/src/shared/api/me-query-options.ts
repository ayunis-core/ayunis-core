import { queryOptions } from '@tanstack/react-query';
import {
  authenticationControllerMe,
  getAuthenticationControllerMeQueryKey,
} from '@ayunis/api-client/endpoints';

export const meQueryOptions = () =>
  queryOptions({
    queryKey: getAuthenticationControllerMeQueryKey(),
    queryFn: () => authenticationControllerMe(),
  });
