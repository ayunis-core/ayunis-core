import { McpResource, ResourceArgument } from './mcp-resource.entity';

describe('McpResource', () => {
  it('should instantiate correctly with all required fields', () => {
    const resource = new McpResource(
      'file://docs/readme.md',
      'README',
      'Project documentation',
      'text/markdown',
      'integration-123',
    );

    expect(resource.uri).toBe('file://docs/readme.md');
    expect(resource.name).toBe('README');
    expect(resource.description).toBe('Project documentation');
    expect(resource.mimeType).toBe('text/markdown');
    expect(resource.integrationId).toBe('integration-123');
    expect(resource.arguments).toBeUndefined();
  });

  it('should handle optional description', () => {
    const resource = new McpResource(
      'http://api.example.com/data',
      'API Data',
      undefined,
      'application/json',
      'integration-456',
    );

    expect(resource.uri).toBe('http://api.example.com/data');
    expect(resource.name).toBe('API Data');
    expect(resource.description).toBeUndefined();
    expect(resource.mimeType).toBe('application/json');
  });

  it('should handle optional mimeType', () => {
    const resource = new McpResource(
      'custom://resource',
      'Custom Resource',
      'A custom resource type',
      undefined,
      'integration-789',
    );

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

    const resource = new McpResource(
      'file://dynamic/{path}',
      'Dynamic File',
      'Access files dynamically',
      'application/octet-stream',
      'integration-999',
      args,
    );

    expect(resource.arguments).toEqual(args);
    expect(resource.arguments).toHaveLength(2);
    expect(resource.arguments?.[0].name).toBe('path');
    expect(resource.arguments?.[0].required).toBe(true);
    expect(resource.arguments?.[1].name).toBe('encoding');
    expect(resource.arguments?.[1].required).toBe(false);
  });

  it('should handle resource with no description or mimeType', () => {
    const resource = new McpResource(
      'resource://test',
      'Test Resource',
      undefined,
      undefined,
      'integration-000',
    );

    expect(resource.uri).toBe('resource://test');
    expect(resource.name).toBe('Test Resource');
    expect(resource.description).toBeUndefined();
    expect(resource.mimeType).toBeUndefined();
    expect(resource.integrationId).toBe('integration-000');
  });

  it('should handle empty arguments array', () => {
    const resource = new McpResource(
      'resource://with-empty-args',
      'Resource',
      'Has empty args',
      'text/plain',
      'integration-111',
      [],
    );

    expect(resource.arguments).toEqual([]);
    expect(resource.arguments).toHaveLength(0);
  });
});
