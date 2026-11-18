import { applyDomPatch } from '@/shared/lib/dom-patch';
import { initAppsignal } from '@/shared/lib/appsignal';
import {
  attemptChunkReload,
  clearChunkReloadFlag,
} from '@/shared/lib/chunk-reload-guard';

/** Runs before React renders, on every page that mounts the app. */
export function bootPage(): void {
  applyDomPatch();
  initAppsignal();

  // Clear the reload flag on successful load to allow future reloads if needed
  clearChunkReloadFlag();

  // Auto-reload when Vite chunk imports fail after a deployment
  // (users with stale index.html try to load chunks that no longer exist)
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    attemptChunkReload();
  });
}
