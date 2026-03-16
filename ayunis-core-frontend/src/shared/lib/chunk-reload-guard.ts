const CHUNK_RELOAD_KEY = 'chunk-reload-attempted';

/**
 * Attempts to reload the page to recover from a chunk load error,
 * but only once per session to prevent infinite reload loops.
 *
 * @returns `true` if a reload was triggered, `false` if a reload
 *          was already attempted (caller should show error UI instead).
 */
export function attemptChunkReload(): boolean {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      return false;
    }
    sessionStorage.setItem(CHUNK_RELOAD_KEY, 'true');
    window.location.reload();
    return true;
  } catch {
    // sessionStorage may be unavailable (private browsing, etc.)
    // Fall back to showing error UI rather than risking a loop
    return false;
  }
}

/**
 * Clears the chunk reload flag. Call this after a successful page load
 * to allow future reloads if needed.
 */
export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    // Ignore errors if sessionStorage is unavailable
  }
}
