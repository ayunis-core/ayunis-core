# MCP Integration Setup Guide (Admin)

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Setting Up Predefined Integrations](#setting-up-predefined-integrations)
4. [Setting Up Custom Integrations](#setting-up-custom-integrations)
5. [Authentication Methods](#authentication-methods)
6. [Validation and Troubleshooting](#validation-and-troubleshooting)
7. [Security Best Practices](#security-best-practices)
8. [Common Issues and Solutions](#common-issues-and-solutions)

## Overview

The MCP (Model Context Protocol) integration feature allows Ayunis Core to connect to external MCP servers, enabling agents to access additional tools, resources, and prompts. As an organization administrator, you can configure both predefined and custom MCP integrations for your organization.

**What MCP Integrations Enable:**
- **Tools**: Execute functions on external MCP servers (e.g., search GitHub repositories, query databases)
- **Resources**: Retrieve data from external sources (e.g., CSV files, documentation)
- **Prompts**: Access pre-configured prompt templates from MCP servers

## Prerequisites

Before setting up MCP integrations:

1. **Admin Access**: You must have the `ADMIN` role in your organization
2. **MCP Server Details**: Obtain the MCP server URL from your service provider
3. **Authentication Credentials**: Get API keys or Bearer tokens if required
4. **Network Access**: Ensure your Ayunis instance can reach the MCP server URL

## Setting Up Predefined Integrations

Predefined integrations are pre-configured MCP servers with known schemas and connection details. Ayunis currently supports common MCP providers.

### Step-by-Step Setup

1. **Navigate to MCP Integrations**
   - Log in to Ayunis as an organization admin
   - Go to Settings → MCP Integrations

2. **Create Predefined Integration**
   - Click "Add Integration" → "Predefined"
   - Select the integration type from the dropdown (e.g., "GitHub MCP", "Notion MCP")
   - Enter a display name for your integration (e.g., "Company GitHub Integration")

3. **Configure Authentication** (if required)
   - Select the authentication method (API Key or Bearer Token)
   - Enter your credentials securely
   - The system will encrypt credentials before storage

4. **Validate Connection**
   - Click "Validate" to test the connection
   - The system will check:
     - Server reachability
     - Authentication validity
     - Available capabilities (tools, resources, prompts)
   - You should see a success message with capability counts

5. **Enable Integration**
   - If validation succeeds, the integration is automatically enabled
   - You can disable/enable it later as needed

### Example: Setting Up GitHub MCP Integration

```
Integration Type: Predefined
Slug: github-mcp
Display Name: Company GitHub Integration
Authentication Method: API Key
Auth Header Name: Authorization
Credentials: ghp_YOUR_GITHUB_TOKEN_HERE
```

## Setting Up Custom Integrations

Custom integrations allow you to connect to any MCP-compatible server, including internal or third-party services.

### Step-by-Step Setup

1. **Navigate to MCP Integrations**
   - Go to Settings → MCP Integrations

2. **Create Custom Integration**
   - Click "Add Integration" → "Custom"
   - Enter a descriptive name (e.g., "Internal Data Service")
   - Enter the full MCP server URL (e.g., `https://mcp.example.com/api`)

3. **Configure Authentication** (if required)
   - Select authentication method:
     - **API Key**: Server expects `X-API-Key: <your-key>` header
     - **Bearer Token**: Server expects `Authorization: Bearer <your-token>` header
   - Enter the auth header name (customize if needed)
   - Enter your credentials securely

4. **Validate Connection**
   - Click "Validate" to discover server capabilities
   - Review available tools, resources, and prompts

5. **Enable Integration**
   - Enable the integration to make it available to agents

### Example: Custom Internal MCP Server

```
Name: Internal Data Service
Server URL: https://internal-mcp.company.com/api/v1
Authentication Method: Bearer Token
Auth Header Name: Authorization
Credentials: your-internal-bearer-token
```

## Authentication Methods

### API Key Authentication

Used when the MCP server expects an API key in a custom header.

**Configuration:**
- **Auth Method**: `api_key`
- **Auth Header Name**: Usually `X-API-Key` or `Authorization`
- **Credentials**: Your API key

**Example Headers Sent:**
```
X-API-Key: your-api-key-here
```

### Bearer Token Authentication

Used when the MCP server expects OAuth2-style bearer tokens.

**Configuration:**
- **Auth Method**: `bearer_token`
- **Auth Header Name**: `Authorization`
- **Credentials**: Your token (without "Bearer" prefix)

**Example Headers Sent:**
```
Authorization: Bearer your-token-here
```

### No Authentication

Some internal MCP servers may not require authentication.

**Configuration:**
- Leave authentication fields empty
- Validate to confirm connectivity

## Validation and Troubleshooting

### Validation Process

The validation process checks:

1. **Connectivity**: Can Ayunis reach the MCP server?
2. **Authentication**: Are credentials valid?
3. **Capabilities**: What tools/resources/prompts are available?

**Validation Results:**
- **Success**: Shows capability counts (e.g., "5 tools, 3 resources, 2 prompts")
- **Failure**: Shows specific error message

### Common Validation Errors

#### 1. Connection Timeout

**Error Message:**
```
Connection to MCP integration 'GitHub MCP' (ID: abc-123) timed out.
Please verify the server at https://***@mcp.github.com is running and accessible.
Check network connectivity and server status.
```

**Solutions:**
- Verify the server URL is correct
- Check if the MCP server is online
- Ensure no firewall is blocking the connection
- Test connectivity with `curl` or `ping`

#### 2. Authentication Failed

**Error Message:**
```
Authentication failed for MCP integration 'GitHub MCP' (ID: abc-123).
Please verify your API key or Bearer token is correct and has not expired.
Check the integration's authentication configuration.
```

**Solutions:**
- Verify credentials are correct
- Check if the API key/token has expired
- Ensure the correct auth header name is used
- Regenerate credentials from the MCP provider

#### 3. Invalid Server URL

**Error Message:**
```
Invalid server URL: not-a-valid-url
```

**Solutions:**
- Enter a valid URL starting with `http://` or `https://`
- Remove trailing slashes if the MCP server doesn't expect them
- Verify the URL with the MCP provider

## Security Best Practices

### Credential Management

1. **Never Share Credentials**: Each organization should have its own MCP credentials
2. **Rotate Regularly**: Change API keys/tokens every 90 days
3. **Use Least Privilege**: Grant only necessary permissions to MCP tokens
4. **Monitor Usage**: Review MCP integration logs for unusual activity

### Encryption

- All credentials are encrypted at rest using AES-256-GCM
- Credentials are decrypted only when needed for MCP communication
- Credentials are never logged or exposed in API responses

### Network Security

- Use HTTPS for all MCP server connections
- Consider using VPN or private networks for internal MCP servers
- Whitelist Ayunis server IPs on your MCP firewall if possible

### Access Control

- Only organization admins can create/modify/delete integrations
- Regular users can only view and use assigned integrations
- Audit logs track all integration changes

## Common Issues and Solutions

### Issue: Integration Not Appearing in Agent Configuration

**Problem**: Created an integration but it doesn't show up when configuring agents.

**Solutions:**
1. Ensure the integration is **enabled**
2. Validate the integration successfully
3. Check you're logged in as the same organization
4. Refresh the page

### Issue: "MCP integration is disabled" Error

**Problem**: Agent tries to use a disabled integration.

**Solutions:**
1. Go to Settings → MCP Integrations
2. Find the integration and click "Enable"
3. Validate the integration if needed
4. Retry the agent operation

### Issue: Tools Execute But Return Errors

**Problem**: MCP tools are discovered but fail during execution.

**Solutions:**
1. Check MCP server logs for detailed errors
2. Verify tool parameters match the expected schema
3. Test the tool directly via MCP server API (if available)
4. Check if the MCP server has rate limits or quotas

### Issue: CSV Resources Not Processing

**Problem**: CSV resource is retrieved but not indexed.

**Solutions:**
1. Verify the CSV file has a proper header row
2. Check CSV encoding is UTF-8
3. Ensure CSV is not too large (default limit: 10MB)
4. Review backend logs for parsing errors

## Next Steps

Once MCP integrations are set up:

1. **Assign to Agents**: Go to agent configuration and assign integrations
2. **Test in Conversations**: Create a thread and test MCP tools/resources
3. **Monitor Health**: Check the health endpoint at `/api/mcp-integrations/health`
4. **Review Logs**: Monitor application logs for MCP operations

## Support

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting Guide](../troubleshooting/mcp-integration.md)
2. Review application logs (look for `[MCP]` prefix)
3. Contact Ayunis support with:
   - Integration ID
   - Error messages
   - Validation results

## References

- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [User Guide: Using MCP Integrations](../users/mcp-agent-assignment.md)
- [Troubleshooting: MCP Integration Issues](../troubleshooting/mcp-integration.md)
