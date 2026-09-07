import { describe, expect, it } from 'vitest';
import { isChatSidePanelVisible } from './is-chat-side-panel-visible';

describe('isChatSidePanelVisible', () => {
  it('does not reserve an empty panel for a newly opened chat', () => {
    expect(isChatSidePanelVisible(false, null, false)).toBe(false);
  });

  it('shows an active artifact panel', () => {
    expect(isChatSidePanelVisible(true, null, false)).toBe(true);
  });
});
