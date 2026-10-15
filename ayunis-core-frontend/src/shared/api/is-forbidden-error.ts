import { AxiosError } from 'axios';

export function isForbiddenError(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 403;
}
