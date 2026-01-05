import config from '@/shared/config';

/**
 * Initializes the release notes widget if the feature flag is enabled.
 * This must be called during app initialization.
 */
export function initReleaseNotes(): void {
  if (!config.features.releaseNotes) {
    return;
  }

  // Initialize the widget configuration
  (window as any).announcable_init = {
    org_id: 'bbcb0cc9-f4b8-4e54-a2a7-bfcac8b98154',
    anchor_query_selector: '#updates-button',
  };

  // Dynamically load the widget script
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://release-notes.locaboo.de/widget';
  script.async = true;
  document.body.appendChild(script);
}
