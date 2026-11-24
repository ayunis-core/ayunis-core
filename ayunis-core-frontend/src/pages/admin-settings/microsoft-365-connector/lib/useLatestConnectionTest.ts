import { useCallback, useRef, useState } from 'react';
import {
  ConnectorStatus,
  type Microsoft365ConnectionTestResponseDto,
} from '@ayunis/api-client/schemas';

export type ShowConnectionTest = (
  result: Microsoft365ConnectionTestResponseDto,
) => void;

/**
 * Saving, testing and removing all set the shown result, and their requests
 * can overlap. A result is shown only when its request started after the one
 * shown, so a slow, older test never replaces a newer result or reappears
 * after the connection was removed, while a newer request that fails leaves
 * the older one's result to be shown.
 */
export function useLatestConnectionTest(status: ConnectorStatus | undefined) {
  const [connectionTest, setConnectionTest] =
    useState<Microsoft365ConnectionTestResponseDto | null>(null);
  // Also when the connection was removed elsewhere: a result must not
  // reappear once it is set up again, possibly with other credentials.
  const [previousStatus, setPreviousStatus] = useState(status);
  if (status !== previousStatus) {
    setPreviousStatus(status);
    if (status !== ConnectorStatus.set_up) setConnectionTest(null);
  }
  const started = useRef(0);
  const shown = useRef(0);

  const startRequest = useCallback((): ShowConnectionTest => {
    const request = ++started.current;
    return (result) => {
      if (request <= shown.current) return;
      shown.current = request;
      setConnectionTest(result);
    };
  }, []);

  const clearConnectionTest = useCallback(() => {
    shown.current = ++started.current;
    setConnectionTest(null);
  }, []);

  return { connectionTest, startRequest, clearConnectionTest };
}
