# MCP Integration Troubleshooting Guide

## Table of Contents

1. [Overview](#overview)
2. [Diagnostic Tools](#diagnostic-tools)
3. [Common Issues](#common-issues)
4. [Error Code Reference](#error-code-reference)
5. [Log Analysis](#log-analysis)
6. [Advanced Debugging](#advanced-debugging)

## Overview

This guide provides step-by-step troubleshooting for common MCP integration issues. It's designed for both administrators and technical support staff.

**Quick Tips:**
- Always check the health endpoint first: `GET /api/mcp-integrations/health`
- Review application logs for `[MCP]` prefixed entries
- Validate integrations after any configuration changes
- Test with simple operations before complex workflows

## Diagnostic Tools

### Health Check Endpoint

**Endpoint:** `GET /api/mcp-integrations/health`
**Authentication:** Public (no authentication required)

**Purpose:** Provides quick overview of all MCP integrations status.

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-28T12:00:00Z",
  "integrations": [
    {
      "id": "abc-123",
      "name": "GitHub MCP",
      "type": "predefined",
      "status": "healthy",
      "lastChecked": "2025-10-28T11:59:00Z",
      "enabled": true
    }
  ]
}
```

**Interpretation:**
- `status: "healthy"` = At least one integration is working
- `status: "unhealthy"` = All integrations are failing
- Check individual `integration.status` for specific issues

### Validation Endpoint

**Endpoint:** `POST /api/mcp-integrations/:id/validate`
**Authentication:** Organization admin required

**Purpose:** Test connectivity and discover capabilities.

**Example Response:**
```json
{
  "valid": true,
  "capabilities": {
    "tools": 5,
    "resources": 3,
    "prompts": 2
  }
}
```

### Application Logs

**Location:** Check your application logging configuration

**Filter:** Look for entries starting with `[MCP]`

**Example Log Entries:**
```
[MCP] operation=validate integration=abc-123 name="GitHub MCP" status=success tools=5 resources=3 prompts=2 duration=250ms
[MCP] operation=execute_tool integration=abc-123 tool="search_code" status=error error="Connection timeout" duration=5000ms
```

## Common Issues

### Issue 1: Integration Validation Failed

**Symptom:**
```
Validation failed for MCP integration 'GitHub MCP' (ID: abc-123).
Connection timeout. Please check the configuration and try again.
```

**Possible Causes:**
1. MCP server is offline or unreachable
2. Incorrect server URL
3. Network connectivity issues
4. Firewall blocking connection

**Troubleshooting Steps:**

1. **Verify Server URL**
   ```bash
   curl -I https://mcp-server-url.com/api
   ```
   - Should return HTTP 200 or similar success status
   - Check for typos in the URL
   - Verify protocol (http vs https)

2. **Test Network Connectivity**
   ```bash
   ping mcp-server-domain.com
   telnet mcp-server-domain.com 443
   ```
   - Ensure DNS resolves correctly
   - Verify port is accessible

3. **Check Firewall Rules**
   - Whitelist Ayunis server IP on MCP server firewall
   - Ensure outbound connections are allowed from Ayunis

4. **Review MCP Server Status**
   - Contact MCP provider for status page
   - Check for scheduled maintenance
   - Verify service is operational

**Resolution:**
- Correct the server URL if wrong
- Wait for MCP server to come back online
- Configure firewall rules
- Re-validate after fixing

---

### Issue 2: Authentication Failed

**Symptom:**
```
Authentication failed for MCP integration 'GitHub MCP' (ID: abc-123).
Please verify your API key or Bearer token is correct and has not expired.
```

**Possible Causes:**
1. Invalid or expired credentials
2. Wrong authentication method selected
3. Incorrect auth header name
4. Credentials not properly formatted

**Troubleshooting Steps:**

1. **Verify Credentials**
   - Check credentials with MCP provider
   - Regenerate API key/token if needed
   - Ensure no extra spaces or characters

2. **Test Credentials Directly**
   ```bash
   # For API Key
   curl -H "X-API-Key: YOUR_KEY" https://mcp-server-url.com/api

   # For Bearer Token
   curl -H "Authorization: Bearer YOUR_TOKEN" https://mcp-server-url.com/api
   ```
   - Should return successful response
   - Compare header format with Ayunis configuration

3. **Check Authentication Method**
   - Verify correct method selected (api_key vs bearer_token)
   - Confirm auth header name matches MCP server expectation
   - Common headers:
     - API Key: `X-API-Key`, `API-Key`, `Authorization`
     - Bearer: Always `Authorization`

4. **Review Permissions**
   - Ensure API key has necessary permissions
   - Check for scope restrictions
   - Verify credentials aren't rate-limited

**Resolution:**
- Update credentials in integration settings
- Select correct authentication method
- Correct auth header name
- Re-validate after updating

---

### Issue 3: MCP Tool Execution Timeout

**Symptom:**
```
Tool execution failed for 'search_code' in MCP integration 'GitHub MCP' (ID: abc-123).
Reason: Request timeout after 30 seconds.
```

**Possible Causes:**
1. MCP server is slow or overloaded
2. Tool operation is expensive (large dataset)
3. Network latency issues
4. Tool parameters causing long execution

**Troubleshooting Steps:**

1. **Check MCP Server Responsiveness**
   ```bash
   time curl https://mcp-server-url.com/api/health
   ```
   - Should respond in < 2 seconds
   - Slow response indicates server issues

2. **Review Tool Parameters**
   - Are you querying too much data?
   - Can you narrow the search scope?
   - Example: Limit date ranges, reduce page sizes

3. **Check Server Logs**
   - Review MCP server logs for the failing request
   - Look for:
     - Database query timeouts
     - External API calls
     - Resource exhaustion

4. **Test with Simpler Operation**
   - Try a basic tool with minimal parameters
   - If basic operation works, issue is parameter-specific

**Resolution:**
- Optimize tool parameters (smaller scope)
- Contact MCP provider about performance
- Increase timeout if appropriate (requires code change)
- Use pagination for large datasets

---

### Issue 4: CSV Resource Processing Failed

**Symptom:**
```
Resource retrieval failed for 'sales/q1-2025.csv' in MCP integration 'Data MCP' (ID: abc-123).
Reason: CSV parsing error - invalid format.
```

**Possible Causes:**
1. CSV file is malformed
2. Incorrect encoding (not UTF-8)
3. File exceeds size limit
4. Missing header row

**Troubleshooting Steps:**

1. **Validate CSV Format**
   - Download the CSV directly from MCP server
   - Open in spreadsheet application
   - Check for:
     - Header row present
     - Consistent column count across rows
     - No stray commas or quotes

2. **Check File Encoding**
   ```bash
   file -i sales-q1-2025.csv
   # Should show: charset=utf-8
   ```
   - Convert to UTF-8 if needed:
     ```bash
     iconv -f ISO-8859-1 -t UTF-8 input.csv > output.csv
     ```

3. **Verify File Size**
   ```bash
   ls -lh sales-q1-2025.csv
   ```
   - Default limit: 10MB (configurable)
   - Large files should be split or processed differently

4. **Test CSV Structure**
   ```bash
   head -n 5 sales-q1-2025.csv
   ```
   - Verify header row
   - Check for consistent formatting

**Resolution:**
- Fix CSV formatting issues
- Convert to UTF-8 encoding
- Split large files into smaller chunks
- Ensure header row is present
- Re-retrieve resource after fixing

---

### Issue 5: Integration Appears Disabled

**Symptom:**
```
MCP integration 'GitHub MCP' (ID: abc-123) is disabled.
Please enable it before use.
```

**Possible Causes:**
1. Integration manually disabled by admin
2. Validation failure caused automatic disable
3. Credentials expired

**Troubleshooting Steps:**

1. **Check Integration Status**
   - Go to Settings → MCP Integrations
   - Find the integration
   - Check "Enabled" status

2. **Review Disable History**
   - Check application logs for disable events:
     ```
     [MCP] operation=disable integration=abc-123 reason="..."
     ```

3. **Validate Before Enabling**
   - Click "Validate" first
   - Ensure validation succeeds
   - Fix any validation errors

**Resolution:**
- Click "Enable" to re-enable integration
- Fix underlying validation issues
- Update credentials if expired
- Re-validate to confirm

---

### Issue 6: Tools Not Discovered After Setup

**Symptom:**
- Integration validates successfully
- Capability counts show 0 tools, 0 resources, 0 prompts
- MCP server should provide capabilities

**Possible Causes:**
1. MCP server not implementing discovery correctly
2. Server returning empty capability lists
3. Version mismatch in MCP protocol

**Troubleshooting Steps:**

1. **Test Discovery Manually**
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
     https://mcp-server-url.com/api/tools/list
   ```
   - Should return JSON array of tools

2. **Check MCP Protocol Version**
   - Verify MCP server supports protocol version used by Ayunis
   - Check server documentation

3. **Review Server Logs**
   - Look for discovery request handling
   - Check for errors in capability enumeration

4. **Contact MCP Provider**
   - Confirm server is configured correctly
   - Verify capabilities are enabled

**Resolution:**
- Work with MCP provider to fix discovery
- Update to compatible protocol version
- Ensure server configuration enables capabilities

## Error Code Reference

### MCP_INTEGRATION_NOT_FOUND

**Code:** `MCP_INTEGRATION_NOT_FOUND`
**Status:** 404

**Message:**
```
MCP integration with ID abc-123 not found.
It may have been deleted or you may not have access to it.
```

**Causes:**
- Integration was deleted
- Wrong integration ID
- User not in same organization

**Resolution:**
- Verify integration ID
- Check if integration exists in your organization
- Contact admin if issue persists

---

### MCP_INTEGRATION_ACCESS_DENIED

**Code:** `MCP_INTEGRATION_ACCESS_DENIED`
**Status:** 403

**Message:**
```
Access denied to MCP integration 'GitHub MCP' (ID: abc-123).
This integration belongs to a different organization.
```

**Causes:**
- Integration belongs to another organization
- User switched organizations

**Resolution:**
- Use integration from your own organization
- Contact admin to create similar integration

---

### MCP_CONNECTION_TIMEOUT

**Code:** `MCP_CONNECTION_TIMEOUT`
**Status:** 504

**Message:**
```
Connection to MCP integration 'GitHub MCP' (ID: abc-123) timed out.
Please verify the server at https://***@mcp.github.com is running and accessible.
```

**Causes:**
- MCP server is slow or down
- Network issues
- Firewall blocking

**Resolution:**
- Check server status
- Test network connectivity
- Review firewall rules

---

### MCP_AUTHENTICATION_FAILED

**Code:** `MCP_AUTHENTICATION_FAILED`
**Status:** 401

**Message:**
```
Authentication failed for MCP integration 'GitHub MCP' (ID: abc-123).
Please verify your API key or Bearer token is correct and has not expired.
```

**Causes:**
- Invalid credentials
- Expired token
- Wrong auth method

**Resolution:**
- Update credentials
- Regenerate API key/token
- Verify auth method

---

### MCP_VALIDATION_FAILED

**Code:** `MCP_VALIDATION_FAILED`
**Status:** 400

**Message:**
```
Validation failed for MCP integration 'GitHub MCP' (ID: abc-123).
[Specific reason]. Please check the configuration and try again.
```

**Causes:**
- Invalid configuration
- Connection issues
- Server errors

**Resolution:**
- Review specific error message
- Fix configuration issues
- Validate again

---

### INVALID_SERVER_URL

**Code:** `INVALID_SERVER_URL`
**Status:** 400

**Message:**
```
Invalid server URL: not-a-valid-url
```

**Causes:**
- Malformed URL
- Missing protocol
- Invalid characters

**Resolution:**
- Correct URL format
- Ensure protocol (http:// or https://)
- Remove invalid characters

## Log Analysis

### Understanding Log Format

MCP logs follow a structured format:

```
[MCP] operation=<operation> integration=<id> [name="<name>"] [other_fields] status=<status> [error="<error>"] duration=<ms>ms
```

**Key Fields:**
- `operation`: What action was performed (validate, execute_tool, retrieve_resource, etc.)
- `integration`: Integration UUID
- `name`: Integration display name
- `status`: Result (success, error, failed, etc.)
- `duration`: How long operation took
- `error`: Error message (if failed)

### Example Log Entries

**Successful Validation:**
```
[MCP] operation=validate integration=abc-123 name="GitHub MCP" status=success tools=5 resources=3 prompts=2 duration=250ms
```

**Failed Tool Execution:**
```
[MCP] operation=execute_tool integration=abc-123 name="GitHub MCP" tool="search_code" status=error error="Connection timeout" duration=30000ms
```

**Resource Retrieval:**
```
[MCP] operation=retrieve_resource integration=abc-123 name="Data MCP" uri="sales/q1.csv" mimeType="text/csv" status=success duration=180ms
```

### Log Search Queries

**Find all MCP operations:**
```bash
grep "\[MCP\]" application.log
```

**Find errors only:**
```bash
grep "\[MCP\].*status=error" application.log
```

**Find operations for specific integration:**
```bash
grep "\[MCP\].*integration=abc-123" application.log
```

**Find slow operations (> 5 seconds):**
```bash
grep "\[MCP\].*duration=[5-9][0-9][0-9][0-9]ms" application.log
```

## Advanced Debugging

### Enable Verbose Logging

If using NestJS Logger:

```typescript
// In main.ts or app configuration
app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);
```

### Test MCP Server Directly

Use MCP SDK test utilities:

```bash
npm install @modelcontextprotocol/sdk

# Create test script
node test-mcp-server.js
```

```javascript
// test-mcp-server.js
const { Client } = require('@modelcontextprotocol/sdk/client');

async function test() {
  const client = new Client({
    name: 'test-client',
    version: '1.0.0',
  });

  const transport = /* create transport for your server */;
  await client.connect(transport);

  // Test tool listing
  const tools = await client.listTools();
  console.log('Tools:', tools);

  // Test resource listing
  const resources = await client.listResources();
  console.log('Resources:', resources);
}

test().catch(console.error);
```

### Network Debugging

**Capture HTTP traffic:**

```bash
# Using tcpdump
sudo tcpdump -i any -s 0 -w mcp-traffic.pcap host mcp-server-domain.com

# Analyze with Wireshark
wireshark mcp-traffic.pcap
```

**Check DNS resolution:**

```bash
nslookup mcp-server-domain.com
dig mcp-server-domain.com
```

**Test SSL/TLS:**

```bash
openssl s_client -connect mcp-server-domain.com:443 -showcerts
```

### Database Queries

Check integration records directly:

```sql
-- Find all integrations
SELECT id, name, type, enabled, created_at
FROM mcp_integrations
ORDER BY created_at DESC;

-- Find integrations by organization
SELECT * FROM mcp_integrations
WHERE organization_id = 'org-uuid';

-- Check disabled integrations
SELECT id, name, enabled, updated_at
FROM mcp_integrations
WHERE enabled = false;
```

**Warning:** Never log or expose `encrypted_credentials` field.

## Getting Additional Help

If issues persist after following this guide:

1. **Gather Information:**
   - Integration ID
   - Complete error messages
   - Recent log entries (with `[MCP]` prefix)
   - Validation results
   - Steps to reproduce

2. **Check Documentation:**
   - [Admin Setup Guide](../admin/mcp-integration-setup.md)
   - [User Guide](../users/mcp-agent-assignment.md)
   - [MCP Protocol Docs](https://spec.modelcontextprotocol.io/)

3. **Contact Support:**
   - Ayunis support team
   - MCP server provider (for server-side issues)
   - Include all gathered information

## Prevention Best Practices

### For Administrators

1. **Regular Validation:** Validate integrations weekly
2. **Monitor Health:** Check `/api/mcp-integrations/health` endpoint
3. **Rotate Credentials:** Update API keys/tokens every 90 days
4. **Review Logs:** Regularly check for error patterns
5. **Test After Changes:** Validate after any configuration updates

### For Users

1. **Report Issues Early:** Don't wait for escalation
2. **Provide Details:** Include error messages and steps
3. **Test Simple Cases:** Try basic operations before complex ones
4. **Be Patient:** Some operations take time

## References

- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Admin Guide: MCP Integration Setup](../admin/mcp-integration-setup.md)
- [User Guide: Using MCP Integrations](../users/mcp-agent-assignment.md)
- [Testing Strategy](../testing/mcp-integration-tests.md)
