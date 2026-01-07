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

// Module-level flag to track if script has been loaded (persists across component remounts)
let announcableLoaded = false;

/**
 * Hook to initialize the release notes widget.
 * Must be called in a component that renders AFTER the #updates-button element exists.
 */
export function useReleaseNotes(): void {
  useEffect(() => {
    const orgId = config.features.announcableOrgId;

    // Don't initialize if feature is disabled (no org ID configured)
    if (!orgId) {
      return;
    }

    // Prevent duplicate script injection (survives HMR and React Strict Mode)
    if (announcableLoaded) {
      return;
    }

    const scriptId = 'announcable-widget-script';

    // Also check DOM as a fallback (e.g., if module was reloaded but script persists)
    if (document.getElementById(scriptId)) {
      announcableLoaded = true;
      return;
    }

    // Initialize the widget configuration
    window.announcable_init = {
      org_id: orgId,
      anchor_query_selector: '#updates-button',
    };

    // Dynamically load the widget script
    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'text/javascript';
    script.src = 'https://release-notes.locaboo.de/widget';
    script.async = true;
    document.body.appendChild(script);

    // Mark as loaded - do NOT remove on cleanup since custom elements can't be unregistered
    announcableLoaded = true;

    // No cleanup needed - the widget registers custom elements that persist
    // and cannot be unregistered from CustomElementRegistry
  }, []);
}
