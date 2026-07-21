import { describe, expect, it } from 'vitest';

import type { Hook } from '../contracts/hook';
import {
  MockProvider,
  textTurn,
  toolCallTurn,
} from '../providers/mock/mock-provider';
import { baseInput, collectEvents, echoTool } from './test-helpers';

const twoIterationModel = (): MockProvider =>
  new MockProvider([
    toolCallTurn({ id: 'c1', name: 'echo', input: { value: 'x' } }),
    textTurn('Done'),
  ]);

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

  it('replaces the entire system prompt with setInstructions', async () => {
    const replacer: Hook = {
      name: 'replacer',
      afterToolCall: (ctx) => ctx.setInstructions('Rebuilt prompt.'),
    };
    const model = twoIterationModel();
    await collectEvents(
      baseInput(model, { tools: [echoTool()], hooks: [replacer] }),
    );

    expect(model.requests[0].instructions).toBe('Be helpful.');
    expect(model.requests[1].instructions).toBe('Rebuilt prompt.');
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
