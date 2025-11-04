import { randomUUID } from 'crypto';
import { McpResource, ResourceArgument } from './mcp-resource.entity';

describe('McpResource', () => {
  it('should instantiate correctly with all required fields', () => {
    const integrationId = randomUUID();
    const resource = new McpResource({
      uri: 'file://docs/readme.md',
      name: 'README',
      description: 'Project documentation',
      mimeType: 'text/markdown',
      integrationId,
    });

    expect(resource.uri).toBe('file://docs/readme.md');
    expect(resource.name).toBe('README');
    expect(resource.description).toBe('Project documentation');
    expect(resource.mimeType).toBe('text/markdown');
    expect(resource.integrationId).toBe(integrationId);
    expect(resource.arguments).toBeUndefined();
  });

  it('should handle optional description', () => {
    const resource = new McpResource({
      uri: 'http://api.example.com/data',
      name: 'API Data',
      mimeType: 'application/json',
      integrationId: randomUUID(),
    });

    expect(resource.uri).toBe('http://api.example.com/data');
    expect(resource.name).toBe('API Data');
    expect(resource.description).toBeUndefined();
    expect(resource.mimeType).toBe('application/json');
  });

  it('should handle optional mimeType', () => {
    const resource = new McpResource({
      uri: 'custom://resource',
      name: 'Custom Resource',
      description: 'A custom resource type',
      integrationId: randomUUID(),
    });

    expect(resource.uri).toBe('custom://resource');
    expect(resource.name).toBe('Custom Resource');
    expect(resource.mimeType).toBeUndefined();
  });

  it('should handle resource arguments', () => {
    const args: ResourceArgument[] = [
      {
        name: 'path',
        description: 'File path',
        required: true,
      },
      {
        name: 'encoding',
        description: 'File encoding',
        required: false,
      },
    ];

    const resource = new McpResource({
      uri: 'file://dynamic/{path}',
      name: 'Dynamic File',
      description: 'Access files dynamically',
      mimeType: 'application/octet-stream',
      integrationId: randomUUID(),
      arguments: args,
    });

    expect(resource.arguments).toEqual(args);
    expect(resource.arguments).toHaveLength(2);
    expect(resource.arguments?.[0].name).toBe('path');
    expect(resource.arguments?.[0].required).toBe(true);
    expect(resource.arguments?.[1].name).toBe('encoding');
    expect(resource.arguments?.[1].required).toBe(false);
  });

  it('should handle resource with no description or mimeType', () => {
    const integrationId = randomUUID();
    const resource = new McpResource({
      uri: 'resource://test',
      name: 'Test Resource',
      integrationId,
    });

    expect(resource.uri).toBe('resource://test');
    expect(resource.name).toBe('Test Resource');
    expect(resource.description).toBeUndefined();
    expect(resource.mimeType).toBeUndefined();
    expect(resource.integrationId).toBe(integrationId);
  });

  it('should handle empty arguments array', () => {
    const resource = new McpResource({
      uri: 'resource://with-empty-args',
      name: 'Resource',
      description: 'Has empty args',
      mimeType: 'text/plain',
      integrationId: randomUUID(),
      arguments: [],
    });

    expect(resource.arguments).toEqual([]);
    expect(resource.arguments).toHaveLength(0);
  });
});
