import { createToolCardRegistry } from '@ayunis/chat/tool-cards';
import { describe, expect, it } from 'vitest';

describe('chat tool-card registry', () => {
  it('lets a caller register a card for a new artifact tool', () => {
    const registration = {
      render: () => null,
      artifactFamily: 'page',
      action: { labelKey: 'chat.timeline.actions.publish_artifact' },
    };
    const cards = createToolCardRegistry({ publish_artifact: registration });

    expect(cards.get('publish_artifact')).toBe(registration);
  });

  it('leaves unknown tool names on the timeline fallback, including inherited object names', () => {
    const cards = createToolCardRegistry({});

    expect(cards.get('unknown_tool')).toBeUndefined();
    expect(cards.get('constructor')).toBeUndefined();
  });
});
