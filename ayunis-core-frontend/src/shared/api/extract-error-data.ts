import { AxiosError } from "axios";

interface ErrorData {
  code: string;
  message: string;
  status: number;
}

export default function extractErrorData(error: unknown): ErrorData {
  if (error instanceof AxiosError) {
    return {
      code: error.response?.data?.code,
      message: error.response?.data?.message,
      status: error.response?.status || 500,
    };
  }
  throw error;
}
