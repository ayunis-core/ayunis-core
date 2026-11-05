const SEARCH_TIMEOUT_MS = 10_000;

/** Aborts a search request on timeout or when the caller (the run) cancels. */
export const searchRequestSignal = (signal?: AbortSignal): AbortSignal => {
  const timeout = AbortSignal.timeout(SEARCH_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
};
