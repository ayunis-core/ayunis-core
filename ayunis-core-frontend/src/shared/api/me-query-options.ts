import { queryOptions } from '@tanstack/react-query';
import {
  authenticationControllerMe,
  getAuthenticationControllerMeQueryKey,
} from './generated/ayunisCoreAPI';

export const meQueryOptions = () =>
  queryOptions({
    queryKey: getAuthenticationControllerMeQueryKey(),
    queryFn: () => authenticationControllerMe(),
  });
