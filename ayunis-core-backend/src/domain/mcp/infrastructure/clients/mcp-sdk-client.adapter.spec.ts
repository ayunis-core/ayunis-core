import { Test, TestingModule } from '@nestjs/testing';
import { McpSdkClientAdapter } from './mcp-sdk-client.adapter';
import { McpConnectionConfig } from '../../application/ports/mcp-client.port';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// Mock the SDK
jest.mock('@modelcontextprotocol/sdk/client/index.js');
jest.mock('@modelcontextprotocol/sdk/client/sse.js');

describe('McpSdkClientAdapter', () => {
  let adapter: McpSdkClientAdapter;
  let mockClient: jest.Mocked<Client>;
  let mockTransport: jest.Mocked<SSEClientTransport>;

  const mockConfig: McpConnectionConfig = {
    serverUrl: 'https://mcp.example.com/sse',
  };

  const mockConfigWithAuth: McpConnectionConfig = {
    serverUrl: 'https://mcp.example.com/sse',
    authHeaderName: 'Authorization',
    authToken: 'Bearer test-token',
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock client instance
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      listTools: jest.fn(),
      listResources: jest.fn(),
      listPrompts: jest.fn(),
      callTool: jest.fn(),
      readResource: jest.fn(),
      getPrompt: jest.fn(),
    } as unknown as jest.Mocked<Client>;

    // Create mock transport
    mockTransport = {} as jest.Mocked<SSEClientTransport>;

    // Mock SSEClientTransport constructor
    (
      SSEClientTransport as jest.MockedClass<typeof SSEClientTransport>
    ).mockImplementation(() => mockTransport);

    // Mock Client constructor
    (Client as jest.MockedClass<typeof Client>).mockImplementation(
      () => mockClient,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [McpSdkClientAdapter],
    }).compile();

    adapter = module.get<McpSdkClientAdapter>(McpSdkClientAdapter);
  });

  describe('listTools', () => {
    it('should successfully connect and return tools', async () => {
      // Arrange
      const mockTools = [
        {
          name: 'calculator',
          description: 'Perform calculations',
          inputSchema: {
            type: 'object' as const,
            properties: {
              expression: { type: 'string' },
            },
            required: ['expression'],
          },
        },
      ];

      mockClient.listTools.mockResolvedValue({
        tools: mockTools as any,
      });

      // Act
      const result = await adapter.listTools(mockConfig);

      // Assert
      expect(SSEClientTransport).toHaveBeenCalledWith(
        new URL(mockConfig.serverUrl),
        { requestInit: { headers: {} } },
      );
      expect(Client).toHaveBeenCalledWith(
        { name: 'ayunis-core', version: '1.0.0' },
        { capabilities: { tools: {}, resources: {}, prompts: {} } },
      );
      expect(mockClient.connect).toHaveBeenCalledWith(mockTransport);
      expect(mockClient.listTools).toHaveBeenCalled();
      expect(mockClient.close).toHaveBeenCalled();
      expect(result).toEqual(mockTools);
    });

    it('should close connection even when operation throws error', async () => {
      // Arrange
      mockClient.listTools.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(adapter.listTools(mockConfig)).rejects.toThrow(
        'Network error',
      );
      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should include authentication headers when provided', async () => {
      // Arrange
      mockClient.listTools.mockResolvedValue({ tools: [] as any });

      // Act
      await adapter.listTools(mockConfigWithAuth);

      // Assert
      expect(SSEClientTransport).toHaveBeenCalledWith(
        new URL(mockConfigWithAuth.serverUrl),
        {
          requestInit: {
            headers: {
              Authorization: 'Bearer test-token',
            },
          },
        },
      );
    });

    it('should not add authentication headers when auth is not provided', async () => {
      // Arrange
      mockClient.listTools.mockResolvedValue({ tools: [] as any });

      // Act
      await adapter.listTools(mockConfig);

      // Assert
      expect(SSEClientTransport).toHaveBeenCalledWith(
        new URL(mockConfig.serverUrl),
        { requestInit: { headers: {} } },
      );
    });

    it('should enforce 30-second timeout', async () => {
      // Arrange
      mockClient.listTools.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ tools: [] as any }), 35000);
          }),
      );

      // Act & Assert
      await expect(adapter.listTools(mockConfig)).rejects.toThrow(
        'MCP request timeout',
      );
      expect(mockClient.close).toHaveBeenCalled();
    }, 35000);
  });

  describe('listResources', () => {
    it('should successfully connect and return resources', async () => {
      // Arrange
      const mockResources = [
        {
          uri: 'file:///documents/readme.md',
          name: 'README',
          description: 'Project documentation',
          mimeType: 'text/markdown',
        },
      ];

      mockClient.listResources.mockResolvedValue({
        resources: mockResources as any,
      });

      // Act
      const result = await adapter.listResources(mockConfig);

      // Assert
      expect(mockClient.connect).toHaveBeenCalledWith(mockTransport);
      expect(mockClient.listResources).toHaveBeenCalled();
      expect(mockClient.close).toHaveBeenCalled();
      expect(result).toEqual(mockResources);
    });
  });

  describe('listPrompts', () => {
    it('should successfully connect and return prompts', async () => {
      // Arrange
      const mockPrompts = [
        {
          name: 'code-review',
          description: 'Review code changes',
          arguments: [
            {
              name: 'code',
              description: 'Code to review',
              required: true,
            },
          ],
        },
      ];

      mockClient.listPrompts.mockResolvedValue({
        prompts: mockPrompts as any,
      });

      // Act
      const result = await adapter.listPrompts(mockConfig);

      // Assert
      expect(mockClient.connect).toHaveBeenCalledWith(mockTransport);
      expect(mockClient.listPrompts).toHaveBeenCalled();
      expect(mockClient.close).toHaveBeenCalled();
      expect(result).toEqual(mockPrompts);
    });
  });

  describe('callTool', () => {
    it('should successfully execute tool and return result', async () => {
      // Arrange
      const toolCall = {
        toolName: 'calculator',
        parameters: { expression: '2 + 2' },
      };

      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: '4' }] as any,
        isError: false,
      });

      // Act
      const result = await adapter.callTool(mockConfig, toolCall);

      // Assert
      expect(mockClient.connect).toHaveBeenCalledWith(mockTransport);
      expect(mockClient.callTool).toHaveBeenCalledWith({
        name: 'calculator',
        arguments: { expression: '2 + 2' },
      });
      expect(mockClient.close).toHaveBeenCalled();
      expect(result).toEqual({
        content: [{ type: 'text', text: '4' }],
        isError: false,
      });
    });

    it('should return error result when tool execution fails', async () => {
      // Arrange
      const toolCall = {
        toolName: 'calculator',
        parameters: { expression: 'invalid' },
      };

      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: 'Invalid expression' }] as any,
        isError: true,
      });

      // Act
      const result = await adapter.callTool(mockConfig, toolCall);

      // Assert
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Invalid expression' }],
        isError: true,
      });
    });
  });

  describe('readResource', () => {
    it('should fetch static resource successfully', async () => {
      // Arrange
      const uri = 'file:///documents/readme.md';

      mockClient.readResource.mockResolvedValue({
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: '# README\n\nProject documentation',
          },
        ] as any,
      });

      // Act
      const result = await adapter.readResource(mockConfig, uri);

      // Assert
      expect(mockClient.connect).toHaveBeenCalledWith(mockTransport);
      expect(mockClient.readResource).toHaveBeenCalledWith({ uri });
      expect(mockClient.close).toHaveBeenCalled();
      expect(result).toEqual({
        content: '# README\n\nProject documentation',
        mimeType: 'text/markdown',
      });
    });

    it('should fetch parameterized resource with arguments', async () => {
      // Arrange
      const uri = 'file:///documents/{docId}';
      const parameters = { docId: 'readme' };

      mockClient.readResource.mockResolvedValue({
        contents: [
          {
            uri: 'file:///documents/readme',
            mimeType: 'text/markdown',
            text: '# README',
          },
        ] as any,
      });

      // Act
      const result = await adapter.readResource(mockConfig, uri, parameters);

      // Assert
      expect(mockClient.readResource).toHaveBeenCalledWith({
        uri,
        arguments: parameters,
      });
      expect(result).toEqual({
        content: '# README',
        mimeType: 'text/markdown',
      });
    });

    it('should handle blob content', async () => {
      // Arrange
      const uri = 'file:///images/logo.png';

      mockClient.readResource.mockResolvedValue({
        contents: [
          {
            uri,
            mimeType: 'image/png',
            blob: 'base64encodeddata',
          },
        ] as any,
      });

      // Act
      const result = await adapter.readResource(mockConfig, uri);

      // Assert
      expect(result).toEqual({
        content: 'base64encodeddata',
        mimeType: 'image/png',
      });
    });
  });

  describe('getPrompt', () => {
    it('should retrieve prompt successfully', async () => {
      // Arrange
      const promptName = 'code-review';
      const args = { code: 'function test() {}' };

      mockClient.getPrompt.mockResolvedValue({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Review this code: function test() {}',
            },
          },
        ] as any,
      });

      // Act
      const result = await adapter.getPrompt(mockConfig, promptName, args);

      // Assert
      expect(mockClient.connect).toHaveBeenCalledWith(mockTransport);
      expect(mockClient.getPrompt).toHaveBeenCalledWith({
        name: promptName,
        arguments: args,
      });
      expect(mockClient.close).toHaveBeenCalled();
      expect(result).toEqual({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Review this code: function test() {}',
            },
          },
        ],
      });
    });
  });

  describe('validateConnection', () => {
    it('should return valid=true for working server', async () => {
      // Arrange
      mockClient.listTools.mockResolvedValue({ tools: [] as any });
      mockClient.listResources.mockResolvedValue({ resources: [] as any });
      mockClient.listPrompts.mockResolvedValue({ prompts: [] as any });

      // Act
      const result = await adapter.validateConnection(mockConfig);

      // Assert
      expect(mockClient.connect).toHaveBeenCalledWith(mockTransport);
      expect(mockClient.listTools).toHaveBeenCalled();
      expect(mockClient.listResources).toHaveBeenCalled();
      expect(mockClient.listPrompts).toHaveBeenCalled();
      expect(mockClient.close).toHaveBeenCalled();
      expect(result).toEqual({ valid: true });
    });

    it('should return valid=false with error for unreachable server', async () => {
      // Arrange
      mockClient.connect.mockRejectedValue(new Error('Connection refused'));

      // Act
      const result = await adapter.validateConnection(mockConfig);

      // Assert
      // Note: close is NOT called when connection fails - client is never created
      expect(mockClient.close).not.toHaveBeenCalled();
      expect(result).toEqual({
        valid: false,
        error: 'Connection refused',
      });
    });

    it('should handle timeout during validation', async () => {
      // Arrange
      mockClient.listTools.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ tools: [] as any }), 35000);
          }),
      );

      // Act
      const result = await adapter.validateConnection(mockConfig);

      // Assert
      expect(mockClient.close).toHaveBeenCalled();
      expect(result).toEqual({
        valid: false,
        error: 'MCP request timeout',
      });
    }, 35000);
  });
});
