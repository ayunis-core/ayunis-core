import { AxiosError } from 'axios';

interface ErrorData {
  code: string;
  message: string;
  status: number;
}

interface ResponseData {
  code?: string;
  message?: string;
}

export default function extractErrorData(error: unknown): ErrorData {
  if (error instanceof AxiosError) {
    const responseData = error.response?.data as ResponseData | undefined;
    const code = responseData?.code;
    const message = responseData?.message;
    return {
      code: code ?? 'UNKNOWN_ERROR',
      message: message ?? 'An unknown error occurred',
      status: error.response?.status ?? 500,
    };
  }
  throw error;
}
