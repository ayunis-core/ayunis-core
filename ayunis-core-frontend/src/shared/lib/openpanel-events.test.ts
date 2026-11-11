import { afterEach, assertType, describe, expect, it, vi } from 'vitest';
import type { GetThreadResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  threadInteractionContext,
  trackOpenPanelEvent,
} from './openpanel-events';

const client = vi.hoisted(() => ({
  current: null as { track: ReturnType<typeof vi.fn> } | null,
}));

vi.mock('./openpanel', () => ({
  get openPanel() {
    return client.current;
  },
}));

const thread = {
  workspaceId: null,
  isAnonymous: false,
  mode: 'auto',
  knowledgeBases: [],
  sources: [],
  mcpIntegrations: [],
} satisfies Partial<GetThreadResponseDto>;

describe(trackOpenPanelEvent.name, () => {
  afterEach(() => {
    client.current = null;
  });

  it('sends a catalogue event with its properties', () => {
    client.current = { track: vi.fn().mockResolvedValue(undefined) };

    trackOpenPanelEvent('personalization_saved', { state: 'skipped' });
    trackOpenPanelEvent('workspace_created');

    expect(client.current.track.mock.calls).toEqual([
      ['personalization_saved', { state: 'skipped' }],
      ['workspace_created', undefined],
    ]);
  });

  it('does not surface a rejected send to the tracked action', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    client.current = {
      track: vi.fn().mockRejectedValue(new Error('network down')),
    };

    expect(() =>
      trackOpenPanelEvent('onboarding_hidden_changed', { hidden: true }),
    ).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));

    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('does not surface a throwing SDK call to the tracked action', () => {
    client.current = {
      track: vi.fn(() => {
        throw new Error('sdk bug');
      }),
    };

    expect(() =>
      trackOpenPanelEvent('onboarding_hidden_changed', { hidden: false }),
    ).not.toThrow();
  });

  it('accepts only catalogue events with their exact properties', () => {
    // @ts-expect-error -- not a catalogue event
    assertType(trackOpenPanelEvent('chat_renamed', { title: 'Haushalt' }));
    assertType(
      trackOpenPanelEvent('chat_started', {
        has_skill: false,
        // @ts-expect-error -- free text is not a catalogue property
        title: 'Haushalt',
      }),
    );
    // @ts-expect-error -- not a value of the property's enum
    assertType(trackOpenPanelEvent('personalization_saved', { state: 'x' }));
    assertType(
      trackOpenPanelEvent('productive_outcome', {
        outcome_type: 'artifact_exported',
        output_type: 'document',
        // @ts-expect-error -- a spreadsheet format, not a document format
        format: 'csv',
      }),
    );
  });
});

describe(threadInteractionContext.name, () => {
  it('omits every field of a thread that is not loaded instead of reporting false', () => {
    expect(threadInteractionContext(undefined)).toEqual({});
  });

  it('reports a workspace chat with attached knowledge in Auto', () => {
    expect(
      threadInteractionContext({
        ...thread,
        workspaceId: 'workspace-1',
        knowledgeBases: [{ id: 'kb-1' }],
      }),
    ).toEqual({
      workspace_context: true,
      anonymous_mode: false,
      has_knowledge_base: true,
      has_source: false,
      has_integration: false,
      mode: 'auto',
    });
  });

  it('reports an individually picked model as mode "model"', () => {
    expect(threadInteractionContext({ ...thread, mode: null })).toMatchObject({
      mode: 'model',
    });
  });
});
