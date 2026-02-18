import { randomUUID } from 'crypto';
import { McpPrompt, PromptArgument } from './mcp-prompt.entity';

describe('McpPrompt', () => {
  it('should instantiate correctly with all required fields', () => {
    const integrationId = randomUUID();
    const args: PromptArgument[] = [
      { name: 'topic', required: true },
      { name: 'style', required: false },
    ];

    const prompt = new McpPrompt(
      'generate-blog-post',
      'Generate a blog post on a given topic',
      args,
      integrationId,
    );

    expect(prompt.name).toBe('generate-blog-post');
    expect(prompt.description).toBe('Generate a blog post on a given topic');
    expect(prompt.arguments).toEqual(args);
    expect(prompt.integrationId).toBe(integrationId);
  });

  it('should handle optional description', () => {
    const integrationId = randomUUID();
    const args: PromptArgument[] = [{ name: 'query', required: true }];

    const prompt = new McpPrompt(
      'search-prompt',
      undefined,
      args,
      integrationId,
    );

    expect(prompt.name).toBe('search-prompt');
    expect(prompt.description).toBeUndefined();
    expect(prompt.arguments).toEqual(args);
    expect(prompt.integrationId).toBe(integrationId);
  });

  it('should handle empty arguments array', () => {
    const prompt = new McpPrompt(
      'no-args-prompt',
      'A prompt without arguments',
      [],
      randomUUID(),
    );

    expect(prompt.name).toBe('no-args-prompt');
    expect(prompt.arguments).toEqual([]);
    expect(prompt.arguments).toHaveLength(0);
  });

  it('should handle multiple required arguments', () => {
    const args: PromptArgument[] = [
      { name: 'firstName', required: true },
      { name: 'lastName', required: true },
      { name: 'title', required: true },
    ];

    const prompt = new McpPrompt(
      'format-name',
      'Format a person name',
      args,
      randomUUID(),
    );

    expect(prompt.arguments).toHaveLength(3);
    expect(prompt.arguments.every((arg) => arg.required)).toBe(true);
  });

  it('should handle mix of required and optional arguments', () => {
    const args: PromptArgument[] = [
      { name: 'required1', required: true },
      { name: 'optional1', required: false },
      { name: 'required2', required: true },
      { name: 'optional2', required: false },
    ];

    const prompt = new McpPrompt(
      'mixed-args',
      'Prompt with mixed argument types',
      args,
      randomUUID(),
    );

    expect(prompt.arguments).toHaveLength(4);
    expect(prompt.arguments.filter((arg) => arg.required)).toHaveLength(2);
    expect(prompt.arguments.filter((arg) => !arg.required)).toHaveLength(2);
  });

  it('should preserve argument order', () => {
    const args: PromptArgument[] = [
      { name: 'first', required: true },
      { name: 'second', required: false },
      { name: 'third', required: true },
    ];

    const prompt = new McpPrompt(
      'ordered-prompt',
      'Test order',
      args,
      randomUUID(),
    );

    expect(prompt.arguments[0].name).toBe('first');
    expect(prompt.arguments[1].name).toBe('second');
    expect(prompt.arguments[2].name).toBe('third');
  });
});
