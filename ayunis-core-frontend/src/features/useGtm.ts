import { useEffect } from "react";

export interface UsePageScopedGtmOptions {
  containerId: string; // e.g., "GTM-XXXXXXX"
  enabled: boolean;
}

export function useGtm(options: UsePageScopedGtmOptions): void {
  // Inject/remove GTM head script
  useEffect(() => {
    const { containerId, enabled } = options;
    if (!enabled) return;

    const scriptId = `gtm-inline-init-${containerId}`;

    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${containerId}');`;
      document.head.appendChild(script);
    }

    return () => {
      const existing = document.getElementById(scriptId);
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }
      const externalGtm = document.querySelector(
        `script[src*="googletagmanager.com/gtm.js?id=${containerId}"]`,
      );
      if (externalGtm && externalGtm.parentNode) {
        externalGtm.parentNode.removeChild(externalGtm);
      }
      try {
        const anyGtmLeft = document.querySelector(
          'script[src*="googletagmanager.com/gtm.js?id="]',
        );
        if (!anyGtmLeft) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (window as any).dataLayer;
        }
      } catch {
        // noop
      }
    };
  }, [options.containerId, options.enabled]);

  // Inject/remove GTM noscript iframe in body
  useEffect(() => {
    const { containerId, enabled } = options;
    if (!enabled) return;

    const noscriptId = `gtm-noscript-${containerId}`;

    if (!document.getElementById(noscriptId)) {
      const noscript = document.createElement("noscript");
      noscript.id = noscriptId;
      noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${containerId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
      document.body.appendChild(noscript);
    }

    return () => {
      const existingNoscript = document.getElementById(noscriptId);
      if (existingNoscript && existingNoscript.parentNode) {
        existingNoscript.parentNode.removeChild(existingNoscript);
      }
    };
  }, [options.containerId, options.enabled]);
}
