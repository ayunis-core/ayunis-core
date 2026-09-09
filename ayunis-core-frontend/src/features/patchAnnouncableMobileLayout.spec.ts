import { afterEach, describe, expect, it } from 'vitest';
import { patchAnnouncableMobileLayout } from './patchAnnouncableMobileLayout';

class FakeWidgetSidebar extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<div class="sidebar"></div>';
  }
}

if (!customElements.get('widget-sidebar')) {
  customElements.define('widget-sidebar', FakeWidgetSidebar);
}

describe(patchAnnouncableMobileLayout.name, () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('injects a full-viewport mobile override into the widget shadow root', () => {
    const host = document.createElement('widget-sidebar');
    document.body.append(host);

    const observer = patchAnnouncableMobileLayout();
    const style = host.shadowRoot?.getElementById('ayunis-mobile-patch');

    expect(style).toBeTruthy();
    expect(style?.textContent).toContain('width: 100vw !important');

    observer.disconnect();
  });
});
