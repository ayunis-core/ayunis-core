# MCP Integration Testing Strategy

## Table of Contents

1. [Overview](#overview)
2. [Test Server Setup](#test-server-setup)
3. [Test Scenarios](#test-scenarios)
4. [Running Tests](#running-tests)
5. [Future Implementation](#future-implementation)

## Overview

This document outlines the integration testing strategy for MCP (Model Context Protocol) integration feature. **Note:** This is a testing plan document. Actual test execution is deferred to a future ticket requiring dedicated test infrastructure setup.

**Testing Goals:**
- Verify end-to-end MCP integration workflows
- Ensure proper error handling and recovery
- Validate authentication mechanisms
- Test tool execution, resource retrieval, and prompt handling
- Confirm agent integration works correctly

**Testing Approach:**
- Use mock/test MCP server
- Test both predefined and custom integrations
- Cover happy paths and error scenarios
- Verify proper logging and monitoring

## Test Server Setup

### Option 1: Mock MCP Server (Recommended for CI/CD)

Create a lightweight mock MCP server using the MCP SDK:

**Location:** `test/helpers/mock-mcp-server.ts`

```typescript
import { Server } from '@modelcontextprotocol/sdk/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';

/**
 * Mock MCP server for integration testing.
 * Implements a minimal set of tools, resources, and prompts.
 */
export class MockMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'test-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      },
    );

    this.registerTools();
    this.registerResources();
    this.registerPrompts();
  }

  private registerTools() {
    // Tool 1: Echo (simple string return)
    this.server.tool('echo', 'Echoes back the input', {
      message: {
        type: 'string',
        description: 'Message to echo',
      },
    }, async (params) => {
      return {
        content: [
          {
            type: 'text',
            text: `Echo: ${params.message}`,
          },
        ],
      };
    });

    // Tool 2: Calculate (arithmetic operations)
    this.server.tool('calculate', 'Performs arithmetic calculation', {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide'],
      },
      a: { type: 'number' },
      b: { type: 'number' },
    }, async (params) => {
      const { operation, a, b } = params;
      let result: number;

      switch (operation) {
        case 'add': result = a + b; break;
        case 'subtract': result = a - b; break;
        case 'multiply': result = a * b; break;
        case 'divide':
          if (b === 0) {
            throw new Error('Division by zero');
          }
          result = a / b;
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Result: ${result}`,
          },
        ],
      };
    });

    // Tool 3: Timeout Simulator (for testing timeouts)
    this.server.tool('slow_operation', 'Simulates a slow operation', {
      delay: {
        type: 'number',
        description: 'Delay in milliseconds',
      },
    }, async (params) => {
      await new Promise((resolve) => setTimeout(resolve, params.delay));
      return {
        content: [
          {
            type: 'text',
            text: `Completed after ${params.delay}ms`,
          },
        ],
      };
    });
  }

  private registerResources() {
    // Resource 1: Sample CSV data
    this.server.resource('test://sample.csv', 'Sample CSV data', 'text/csv', async () => {
      const csv = `id,name,value\n1,Item A,100\n2,Item B,200\n3,Item C,300`;
      return {
        contents: [
          {
            uri: 'test://sample.csv',
            mimeType: 'text/csv',
            text: csv,
          },
        ],
      };
    });

    // Resource 2: Parameterized resource
    this.server.resource('test://data/{year}.csv', 'Yearly data', 'text/csv', async (uri) => {
      const match = uri.match(/test:\/\/data\/(\d{4})\.csv/);
      const year = match ? match[1] : '2025';
      const csv = `date,revenue\n${year}-01-01,10000\n${year}-02-01,12000`;
      return {
        contents: [
          {
            uri,
            mimeType: 'text/csv',
            text: csv,
          },
        ],
      };
    });
  }

  private registerPrompts() {
    // Prompt 1: Code review template
    this.server.prompt('code-review', 'Code review template', [
      {
        name: 'code',
        description: 'Code to review',
        required: true,
      },
      {
        name: 'language',
        description: 'Programming language',
        required: false,
      },
    ], async (params) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please review this ${params.language || 'code'}:\n\n${params.code}`,
            },
          },
        ],
      };
    });
  }

  async start(port: number = 3100) {
    // Start server on specified port
    // Implementation depends on transport mechanism
  }

  async stop() {
    // Clean shutdown
  }
}
```

**Starting Mock Server:**

```bash
# In test setup
npm run test:mcp-server:start

# Or programmatically in tests
const server = new MockMcpServer();
await server.start(3100);
```

### Option 2: Use Existing MCP Test Utilities

Leverage official MCP SDK test helpers if available:

```bash
npm install --save-dev @modelcontextprotocol/sdk-test-utils
```

### Test Server Configuration

**Server URL:** `http://localhost:3100/mcp`
**Authentication:** Test API Key: `test-api-key-12345`
**Protocol:** HTTP (for simplicity in testing)

## Test Scenarios

### Scenario 1: Create and Validate Predefined Integration

**Objective:** Verify predefined integration creation and validation workflow.

**Steps:**
1. Create predefined integration via API
   ```http
   POST /api/mcp-integrations/predefined
   {
     "name": "Test MCP Server",
     "slug": "test-mcp",
     "authMethod": "api_key",
     "authHeaderName": "X-API-Key",
     "credentials": "test-api-key-12345"
   }
   ```

2. Validate integration
   ```http
   POST /api/mcp-integrations/{id}/validate
   ```

3. Assert validation success
   ```json
   {
     "valid": true,
     "capabilities": {
       "tools": 3,
       "resources": 2,
       "prompts": 1
     }
   }
   ```

4. Check integration is enabled by default

**Expected Results:**
- ✅ Integration created successfully
- ✅ Validation returns success with capability counts
- ✅ Integration is enabled
- ✅ Logs show successful discovery

**Error Cases to Test:**
- Invalid slug
- Missing credentials
- Wrong auth method
- Server unreachable

---

### Scenario 2: Create Custom Integration

**Objective:** Verify custom integration creation with manual server URL.

**Steps:**
1. Create custom integration
   ```http
   POST /api/mcp-integrations/custom
   {
     "name": "Custom Test Server",
     "serverUrl": "http://localhost:3100/mcp",
     "authMethod": "bearer_token",
     "authHeaderName": "Authorization",
     "credentials": "test-bearer-token"
   }
   ```

2. Validate integration

3. Verify discovery works

**Expected Results:**
- ✅ Integration created with custom URL
- ✅ Validation discovers capabilities
- ✅ Authentication headers sent correctly

**Error Cases to Test:**
- Invalid URL format
- Missing server URL
- Connection refused

---

### Scenario 3: Assign Integration to Agent and Execute Tool

**Objective:** End-to-end test of agent using MCP tool.

**Steps:**
1. Create agent
2. Assign MCP integration to agent
3. Create thread with agent
4. Send message that triggers tool use
   ```
   User: "Echo this message: Hello World"
   ```

5. Agent should:
   - Recognize need for echo tool
   - Execute MCP tool via integration
   - Return result to user

**Expected Results:**
- ✅ Tool discovered and available to agent
- ✅ Tool executed successfully
- ✅ Result returned: "Echo: Hello World"
- ✅ Logs show tool execution

**Error Cases to Test:**
- Disabled integration
- Invalid tool parameters
- Tool execution failure

---

### Scenario 4: Retrieve and Index CSV Resource

**Objective:** Test CSV resource retrieval and data source creation.

**Steps:**
1. Retrieve CSV resource via MCP
   ```http
   POST /api/mcp/retrieve-resource
   {
     "integrationId": "...",
     "resourceUri": "test://sample.csv"
   }
   ```

2. Verify data source created in sources module

3. Query data via RAG pipeline

4. Verify agent can access CSV data in conversations

**Expected Results:**
- ✅ CSV retrieved from MCP server
- ✅ Data source created with proper metadata
- ✅ Data indexed for semantic search
- ✅ Agent can query CSV data

**Error Cases to Test:**
- Malformed CSV
- Large CSV (size limit)
- Invalid encoding
- Resource not found

---

### Scenario 5: Parameterized Resource Retrieval

**Objective:** Test resources with URI templates.

**Steps:**
1. Retrieve resource with parameters
   ```http
   POST /api/mcp/retrieve-resource
   {
     "integrationId": "...",
     "resourceUri": "test://data/2024.csv",
     "parameters": {
       "year": "2024"
     }
   }
   ```

2. Verify parameters substituted correctly

3. Verify correct data returned

**Expected Results:**
- ✅ URI template processed
- ✅ Parameters passed to MCP server
- ✅ Correct year's data returned

---

### Scenario 6: Get MCP Prompt

**Objective:** Test prompt retrieval from MCP server.

**Steps:**
1. Get prompt via API
   ```http
   POST /api/mcp/get-prompt
   {
     "integrationId": "...",
     "promptName": "code-review",
     "arguments": {
       "code": "function test() { return 42; }",
       "language": "javascript"
     }
   }
   ```

2. Verify prompt formatted correctly

3. Use prompt in agent conversation

**Expected Results:**
- ✅ Prompt retrieved with arguments
- ✅ Formatted as expected
- ✅ Agent can use prompt template

---

### Scenario 7: Error Handling - Connection Timeout

**Objective:** Verify proper error handling for timeouts.

**Setup:**
- Configure tool to take > 30 seconds

**Steps:**
1. Execute slow tool
   ```
   Agent executes: slow_operation(delay=35000)
   ```

2. Verify timeout error returned

3. Check error message is user-friendly

**Expected Results:**
- ✅ Operation times out after 30s
- ✅ Error message includes integration name and ID
- ✅ Error message suggests troubleshooting steps
- ✅ Logs show timeout with duration

---

### Scenario 8: Error Handling - Authentication Failure

**Objective:** Test authentication error handling.

**Setup:**
- Create integration with invalid credentials

**Steps:**
1. Validate integration with wrong credentials

2. Verify authentication error

3. Update credentials

4. Re-validate successfully

**Expected Results:**
- ✅ Clear authentication error message
- ✅ Suggests credential verification
- ✅ After update, validation succeeds

---

### Scenario 9: Integration Health Check

**Objective:** Test health check endpoint.

**Steps:**
1. Create multiple integrations (some enabled, some disabled)

2. Call health endpoint
   ```http
   GET /api/mcp-integrations/health
   ```

3. Verify response format

4. Disable all integrations

5. Verify unhealthy status

**Expected Results:**
- ✅ Health check returns integration statuses
- ✅ Overall status "healthy" when at least one enabled
- ✅ Overall status "unhealthy" when all disabled
- ✅ Response includes all integrations

---

### Scenario 10: Concurrent Tool Executions

**Objective:** Test multiple tool executions in parallel.

**Steps:**
1. Agent executes multiple tools simultaneously
2. Verify all complete successfully
3. Check no race conditions or deadlocks

**Expected Results:**
- ✅ All tools execute correctly
- ✅ Results returned in proper order
- ✅ No connection pool exhaustion

## Running Tests

### Setup Test Environment

**Prerequisites:**
```bash
# Install test dependencies
npm install --save-dev @modelcontextprotocol/sdk
npm install --save-dev supertest

# Start mock MCP server
npm run test:mcp-server:start
```

**Environment Variables:**
```bash
# .env.test
TEST_MCP_SERVER_URL=http://localhost:3100/mcp
TEST_MCP_API_KEY=test-api-key-12345
```

### Execute Tests

**Run all integration tests:**
```bash
npm run test:integration:mcp
```

**Run specific scenario:**
```bash
npm run test:integration:mcp -- --grep "Create and Validate"
```

**Run with coverage:**
```bash
npm run test:integration:mcp:coverage
```

### Test Structure

```
test/
├── integration/
│   └── mcp/
│       ├── setup.ts                    # Test environment setup
│       ├── teardown.ts                 # Test cleanup
│       ├── helpers/
│       │   └── mock-mcp-server.ts      # Mock server implementation
│       ├── scenarios/
│       │   ├── 01-create-integration.spec.ts
│       │   ├── 02-validate-integration.spec.ts
│       │   ├── 03-agent-tool-execution.spec.ts
│       │   ├── 04-csv-resource.spec.ts
│       │   ├── 05-parameterized-resource.spec.ts
│       │   ├── 06-mcp-prompt.spec.ts
│       │   ├── 07-error-timeout.spec.ts
│       │   ├── 08-error-authentication.spec.ts
│       │   ├── 09-health-check.spec.ts
│       │   └── 10-concurrent-execution.spec.ts
│       └── fixtures/
│           ├── sample.csv
│           └── test-credentials.json
```

### Example Test

```typescript
// test/integration/mcp/scenarios/01-create-integration.spec.ts
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../../src/app/app.module';

describe('MCP Integration: Create Predefined Integration', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Authenticate as org admin
    const authResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'test-password',
      });

    authToken = authResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create predefined integration successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/mcp-integrations/predefined')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test MCP Server',
        slug: 'test-mcp',
        authMethod: 'api_key',
        authHeaderName: 'X-API-Key',
        credentials: 'test-api-key-12345',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: 'Test MCP Server',
      type: 'predefined',
      enabled: true,
    });

    // Credentials should not be in response
    expect(response.body.credentials).toBeUndefined();
    expect(response.body.encryptedCredentials).toBeUndefined();
  });

  it('should reject invalid slug', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/mcp-integrations/predefined')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Invalid Integration',
        slug: 'invalid-slug-xyz',
        authMethod: 'api_key',
        authHeaderName: 'X-API-Key',
        credentials: 'test-key',
      })
      .expect(400);

    expect(response.body.code).toBe('INVALID_PREDEFINED_SLUG');
  });
});
```

## Future Implementation

### Phase 1: Test Infrastructure Setup (Separate Ticket)

**Tasks:**
- [ ] Implement MockMcpServer class
- [ ] Create test fixtures (CSV files, test data)
- [ ] Set up CI/CD pipeline for integration tests
- [ ] Configure test database
- [ ] Add test npm scripts

**Estimated Effort:** 2-3 days

### Phase 2: Implement Test Scenarios (Separate Ticket)

**Tasks:**
- [ ] Implement Scenarios 1-5 (happy paths)
- [ ] Implement Scenarios 6-8 (error cases)
- [ ] Implement Scenarios 9-10 (edge cases)
- [ ] Add test documentation
- [ ] Achieve 80%+ integration test coverage

**Estimated Effort:** 3-4 days

### Phase 3: CI/CD Integration

**Tasks:**
- [ ] Add integration tests to PR checks
- [ ] Set up test reporting
- [ ] Configure test parallelization
- [ ] Add performance benchmarks

**Estimated Effort:** 1-2 days

## Success Criteria

Integration tests are successful when:

- ✅ All test scenarios pass consistently
- ✅ Tests run in < 5 minutes
- ✅ No flaky tests (99%+ pass rate)
- ✅ Coverage > 80% for MCP module
- ✅ Tests catch real bugs before production
- ✅ Tests run in CI/CD pipeline
- ✅ Clear test failure messages for debugging

## References

- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
