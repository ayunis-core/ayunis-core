import { useCallback, useRef, useState } from 'react';
import type { Microsoft365ConnectionTestResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type ShowConnectionTest = (
  result: Microsoft365ConnectionTestResponseDto,
) => void;

/**
 * Saving, testing and removing all set the shown result, and their requests
 * can overlap. Only the latest one may set it, so a slow, older test never
 * replaces a newer result or reappears after the connection was removed.
 */
export function useLatestConnectionTest() {
  const [connectionTest, setConnectionTest] =
    useState<Microsoft365ConnectionTestResponseDto | null>(null);
  const latestRequest = useRef(0);

  const startRequest = useCallback((): ShowConnectionTest => {
    const request = ++latestRequest.current;
    return (result) => {
      if (request === latestRequest.current) setConnectionTest(result);
    };
  }, []);

  const clearConnectionTest = useCallback(() => {
    latestRequest.current++;
    setConnectionTest(null);
  }, []);

  return { connectionTest, startRequest, clearConnectionTest };
}
