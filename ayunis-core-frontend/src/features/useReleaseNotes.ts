import { useEffect } from 'react';
import config from '@/shared/config';

interface AnnouncableInit {
  org_id: string;
  anchor_query_selector: string;
}

declare global {
  interface Window {
    announcable_init?: AnnouncableInit;
  }
}

/**
 * Hook to initialize the release notes widget.
 * Must be called in a component that renders AFTER the #updates-button element exists.
 */
export function useReleaseNotes(): void {
  useEffect(() => {
    if (!config.features.releaseNotes) {
      return;
    }

    const scriptId = 'announcable-widget-script';

    // Prevent duplicate script injection
    if (document.getElementById(scriptId)) {
      return;
    }

    // Initialize the widget configuration
    window.announcable_init = {
      org_id: 'bbcb0cc9-f4b8-4e54-a2a7-bfcac8b98154',
      anchor_query_selector: '#updates-button',
    };

    // Dynamically load the widget script
    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'text/javascript';
    script.src = 'https://release-notes.locaboo.de/widget';
    script.async = true;
    document.body.appendChild(script);

    // Cleanup on unmount
    return () => {
      const existingScript = document.getElementById(scriptId);
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
      // Clean up the global config
      delete window.announcable_init;
    };
  }, []);
}
