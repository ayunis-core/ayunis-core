import type { AxiosRequestConfig } from 'axios';
import { getApiTransport } from './transport';

export async function customAxiosInstance<T>(
  config: AxiosRequestConfig,
): Promise<T> {
  const response = await getApiTransport().axios.request<T>(config);
  return response.data;
}
