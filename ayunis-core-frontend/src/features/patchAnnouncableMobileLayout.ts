const WIDGET_HOST_SELECTOR =
  'widget-sidebar, widget-modal, widget-popover, ui-dialog';

const MOBILE_PATCH_STYLE_ID = 'ayunis-mobile-patch';

const ANNOUNCABLE_MOBILE_CSS = `
@media (max-width: 40rem) {
  .sidebar {
    width: 100vw !important;
    max-width: 100vw !important;
  }
  .popover {
    width: calc(100vw - 2rem) !important;
    max-width: calc(100vw - 2rem) !important;
    left: 1rem !important;
    right: 1rem !important;
  }
  dialog {
    max-width: 100% !important;
    padding: 0.5rem !important;
  }
}
`;

function injectIntoShadowRoot(shadow: ShadowRoot): void {
  if (shadow.getElementById(MOBILE_PATCH_STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = MOBILE_PATCH_STYLE_ID;
  style.textContent = ANNOUNCABLE_MOBILE_CSS;
  shadow.appendChild(style);
  patchTree(shadow);
}

function patchTree(root: ParentNode): void {
  root.querySelectorAll(WIDGET_HOST_SELECTOR).forEach((element) => {
    const shadow = (element as HTMLElement).shadowRoot;
    if (shadow) {
      injectIntoShadowRoot(shadow);
    }
  });
}

export function patchAnnouncableMobileLayout(
  root: ParentNode = document,
): MutationObserver {
  patchTree(root);
  const observer = new MutationObserver(() => {
    patchTree(root);
  });
  const target = root instanceof Document ? root.body : root;
  observer.observe(target, { childList: true, subtree: true });
  return observer;
}
