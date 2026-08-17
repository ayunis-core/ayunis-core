import { describe, expect, it } from 'vitest';

import type { Hook } from '../contracts/hook';
import type { Tool } from '../contracts/tool';
import {
  MockProvider,
  textTurn,
  toolCallTurn,
} from '../providers/mock/mock-provider';
import { PendingMutations } from './mutations';
import { baseInput, collectEvents, echoTool } from './test-helpers';

const twoIterationModel = (): MockProvider =>
  new MockProvider([
    toolCallTurn({ id: 'c1', name: 'echo', input: { value: 'x' } }),
    textTurn('Done'),
  ]);

describe('PendingMutations tool previews', () => {
  it('does not expose or pass through the mutable run tool array', () => {
    const original = echoTool();
    const added = echoTool({ name: 'added' });
    const config = {
      messages: [],
      tools: [original],
      instructions: '',
    };
    const mutations = new PendingMutations();
    mutations.transformTools((tools) => {
      (tools as Tool[]).push(added);
      throw new Error('transform failed');
    });

    expect(() => mutations.getProspectiveTools(config.tools)).toThrow(
      'transform failed',
    );
    expect(config.tools).toEqual([original]);

    const clean = new PendingMutations();
    const prospective = clean.getProspectiveTools(config.tools);
    expect(() => (prospective as Tool[]).push(added)).toThrow();
    expect(config.tools).toEqual([original]);
  });
});

describe('hook mutations', () => {
  it('applies runStart mutations to the first model call', async () => {
    const seeder: Hook = {
      name: 'seeder',
      runStart: (ctx) => ctx.addInstructions('Seeded instruction.'),
    };
    const model = new MockProvider([textTurn('Hi')]);
    await collectEvents(baseInput(model, { hooks: [seeder] }));

    expect(model.requests[0].instructions).toBe(
      'Be helpful.\n\nSeeded instruction.',
    );
  });

  it('applies beforeModelCall message transforms to the imminent call', async () => {
    const redactor: Hook = {
      name: 'redactor',
      beforeModelCall: (ctx) =>
        ctx.transformMessages((messages) =>
          messages.map((message) => ({
            ...message,
            content: message.content.map((content) =>
              content.type === 'text'
                ? {
                    ...content,
                    text: content.text.replaceAll('Hi', '[GREETING]'),
                  }
                : content,
            ),
          })),
        ),
    };
    const model = new MockProvider([textTurn('Hello')]);
    await collectEvents(baseInput(model, { hooks: [redactor] }));

    expect(model.requests[0].messages[0].content[0]).toMatchObject({
      text: '[GREETING]',
    });
  });

  it('exposes same-phase prospective tools without re-running transforms', async () => {
    const injected = echoTool({ name: 'injected_tool' });
    const seen: string[][] = [];
    let transforms = 0;
    const injector: Hook = {
      name: 'injector',
      afterModelCall: (ctx) => {
        if (ctx.iteration === 0) {
          ctx.addTools(injected);
          ctx.transformTools((tools) => {
            transforms += 1;
            return [...tools];
          });
        }
      },
    };
    const observer: Hook = {
      name: 'observer',
      afterModelCall: (ctx) => {
        if (ctx.iteration === 0) {
          seen.push(ctx.getProspectiveTools().map((tool) => tool.name));
        }
      },
    };
    const model = twoIterationModel();

    await collectEvents(
      baseInput(model, {
        tools: [echoTool()],
        hooks: [injector, observer],
      }),
    );

    expect(seen).toEqual([['echo', 'injected_tool']]);
    expect(transforms).toBe(1);
    expect(model.requests[1].tools.map((tool) => tool.name)).toEqual([
      'echo',
      'injected_tool',
    ]);
  });

  it('lets a tool transform inspect the last completed projection once', async () => {
    const original = echoTool();
    const added = echoTool({ name: 'added' });
    const transformed = echoTool({ name: 'transformed' });
    const seen: string[][] = [];
    let transforms = 0;
    const inspector: Hook = {
      name: 'inspector',
      beforeModelCall: (ctx) => {
        ctx.addTools(added);
        ctx.transformTools((tools) => {
          transforms += 1;
          seen.push(ctx.getProspectiveTools().map((tool) => tool.name));
          return [...tools, transformed];
        });
        ctx.removeTools('added');
      },
    };
    const model = new MockProvider([textTurn('Done')]);
    const input = baseInput(model, { tools: [original], hooks: [inspector] });

    await collectEvents(input);

    expect(seen).toEqual([['echo', 'added']]);
    expect(transforms).toBe(1);
    expect(model.requests[0].tools.map((tool) => tool.name)).toEqual([
      'echo',
      'transformed',
    ]);
    expect(input.tools).toEqual([original]);
  });

  it('applies afterToolCall tool injection to the next iteration only', async () => {
    const injected = echoTool({ name: 'injected_tool' });
    const injector: Hook = {
      name: 'injector',
      afterToolCall: (ctx) => ctx.addTools(injected),
    };
    const model = twoIterationModel();
    await collectEvents(
      baseInput(model, { tools: [echoTool()], hooks: [injector] }),
    );

    const first = model.requests[0].tools.map((tool) => tool.name);
    const second = model.requests[1].tools.map((tool) => tool.name);
    expect(first).toEqual(['echo']);
    expect(second).toEqual(['echo', 'injected_tool']);
  });

  it('replaces the entire tool set with setTools', async () => {
    const replacement = echoTool({ name: 'replacement' });
    const replacer: Hook = {
      name: 'replacer',
      afterToolCall: (ctx) => ctx.setTools([replacement]),
    };
    const model = twoIterationModel();
    await collectEvents(
      baseInput(model, { tools: [echoTool()], hooks: [replacer] }),
    );

    expect(model.requests[1].tools.map((tool) => tool.name)).toEqual([
      'replacement',
    ]);
  });

  it('removes tools by name', async () => {
    const remover: Hook = {
      name: 'remover',
      afterToolCall: (ctx) => ctx.removeTools('echo'),
    };
    const model = twoIterationModel();
    await collectEvents(
      baseInput(model, { tools: [echoTool()], hooks: [remover] }),
    );

    expect(model.requests[1].tools).toEqual([]);
  });

  it('appends afterToolCall instruction additions to the next call', async () => {
    const injector: Hook = {
      name: 'injector',
      afterToolCall: (ctx) => ctx.addInstructions('Skill instructions.'),
    };
    const model = twoIterationModel();
    await collectEvents(
      baseInput(model, { tools: [echoTool()], hooks: [injector] }),
    );

    expect(model.requests[0].instructions).toBe('Be helpful.');
    expect(model.requests[1].instructions).toBe(
      'Be helpful.\n\nSkill instructions.',
    );
  });

  it('replaces instructions while preserving later additions', async () => {
    const replacer: Hook = {
      name: 'replacer',
      afterToolCall: (ctx) => {
        ctx.setInstructions('Refreshed system prompt.');
        ctx.addInstructions('Activated skill note.');
      },
    };
    const model = twoIterationModel();
    await collectEvents(
      baseInput(model, { tools: [echoTool()], hooks: [replacer] }),
    );

    expect(model.requests[1].instructions).toBe(
      'Refreshed system prompt.\n\nActivated skill note.',
    );
  });

  it('transforms tools after earlier same-phase operations', async () => {
    const replacement = echoTool({ name: 'replacement' });
    const transformed = echoTool({ name: 'transformed' });
    const projector: Hook = {
      name: 'projector',
      afterToolCall: (ctx) => {
        ctx.addTools(replacement);
        ctx.removeTools('echo');
        ctx.transformTools((tools) => [...tools, transformed]);
      },
    };
    const model = twoIterationModel();
    await collectEvents(
      baseInput(model, { tools: [echoTool()], hooks: [projector] }),
    );

    expect(model.requests[1].tools.map((tool) => tool.name)).toEqual([
      'replacement',
      'transformed',
    ]);
  });

  it('transforms instructions after earlier same-phase operations', async () => {
    const projector: Hook = {
      name: 'projector',
      afterToolCall: (ctx) => {
        ctx.setInstructions('Replacement.');
        ctx.addInstructions('Addition.');
        ctx.transformInstructions((instructions) =>
          instructions.replace('Addition.', 'Transformed.'),
        );
      },
    };
    const model = twoIterationModel();
    await collectEvents(
      baseInput(model, { tools: [echoTool()], hooks: [projector] }),
    );

    expect(model.requests[1].instructions).toBe('Replacement.\n\nTransformed.');
  });

  it('does not call the provider or mutate configuration when a transform fails', async () => {
    const originalTool = echoTool();
    const failing: Hook = {
      name: 'failing-projector',
      beforeModelCall: (ctx) => {
        ctx.addTools(echoTool({ name: 'temporary' }));
        ctx.transformTools((tools) => {
          (tools as Tool[]).push(echoTool({ name: 'corrupting' }));
          ctx.getProspectiveTools();
          throw new Error('projection failed');
        });
      },
    };
    const model = new MockProvider([textTurn('unreachable')]);
    const input = baseInput(model, {
      tools: [originalTool],
      hooks: [failing],
    });
    const events = await collectEvents(input);

    expect(model.requests).toHaveLength(0);
    expect(input.tools).toEqual([originalTool]);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'error',
          code: 'RUN_FAILED',
          message: 'projection failed',
        }),
      ]),
    );
  });

  it('replaces a tool when adding one with an existing name', async () => {
    const upgraded = echoTool({ description: 'Upgraded echo' });
    const upgrader: Hook = {
      name: 'upgrader',
      afterToolCall: (ctx) => ctx.addTools(upgraded),
    };
    const model = twoIterationModel();
    await collectEvents(
      baseInput(model, { tools: [echoTool()], hooks: [upgrader] }),
    );

    expect(model.requests[1].tools).toHaveLength(1);
    expect(model.requests[1].tools[0].description).toBe('Upgraded echo');
  });

  it('keeps injected tools executable on the following iteration', async () => {
    const injected = echoTool({
      name: 'injected_tool',
      execute: () => 'injected result',
    });
    const injector: Hook = {
      name: 'injector',
      afterToolCall: (ctx) => ctx.addTools(injected),
    };
    const model = new MockProvider([
      toolCallTurn({ id: 'c1', name: 'echo', input: { value: 'x' } }),
      toolCallTurn({ id: 'c2', name: 'injected_tool', input: {} }),
      textTurn('Done'),
    ]);
    const events = await collectEvents(
      baseInput(model, { tools: [echoTool()], hooks: [injector] }),
    );

    const results = events.filter((e) => e.type === 'tool_result');
    expect(results[1]).toMatchObject({
      toolName: 'injected_tool',
      result: 'injected result',
    });
  });
});
