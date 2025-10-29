# MCP Agent Assignment Guide (User)

## Table of Contents

1. [Overview](#overview)
2. [What Are MCP Integrations?](#what-are-mcp-integrations)
3. [Assigning Integrations to Agents](#assigning-integrations-to-agents)
4. [Using MCP Capabilities](#using-mcp-capabilities)
5. [Example Conversations](#example-conversations)
6. [Troubleshooting](#troubleshooting)

## Overview

MCP (Model Context Protocol) integrations extend your AI agents with additional capabilities from external services. Once your organization administrator has set up MCP integrations, you can assign them to your agents to enhance their abilities.

## What Are MCP Integrations?

MCP integrations connect your agents to external services, providing three types of capabilities:

### 1. Tools

External functions your agent can execute during conversations.

**Examples:**
- Search GitHub repositories
- Query databases
- Fetch weather information
- Calculate complex formulas
- Send notifications

### 2. Resources

External data sources your agent can access and retrieve.

**Examples:**
- CSV data files
- Documentation repositories
- Knowledge bases
- Real-time data feeds

### 3. Prompts

Pre-configured prompt templates from external services.

**Examples:**
- Code review templates
- Report generation formats
- Analysis frameworks

## Assigning Integrations to Agents

### Step 1: Navigate to Agent Configuration

1. Go to **Agents** in the main navigation
2. Click on an existing agent or create a new one
3. Go to the **Integrations** tab

### Step 2: View Available Integrations

You'll see a list of MCP integrations available in your organization. Each integration shows:
- **Name**: Display name (e.g., "Company GitHub Integration")
- **Type**: Predefined or Custom
- **Status**: Enabled or Disabled
- **Capabilities**: Number of tools, resources, and prompts

### Step 3: Assign Integration to Agent

1. Click **"Assign Integration"** next to the integration you want to add
2. The integration will be immediately available to the agent
3. You can assign multiple integrations to a single agent

### Step 4: Remove Integration (if needed)

1. Click **"Remove"** next to an assigned integration
2. The agent will no longer have access to that integration's capabilities

## Using MCP Capabilities

Once assigned, your agent automatically has access to MCP capabilities during conversations. The agent will use them intelligently based on the conversation context.

### How Agents Use MCP Tools

Agents can automatically call MCP tools when appropriate:

**Example: GitHub Search**

```
You: "Can you search our GitHub repositories for code related to authentication?"

Agent: Let me search for that...
[Agent executes: github_search_code tool with query="authentication"]

Agent: I found 15 files containing authentication code:
1. src/auth/login.ts - Handles user login
2. src/auth/jwt.ts - JWT token generation
3. ...
```

The agent decides when to use tools based on:
- User intent
- Available tools
- Tool descriptions and schemas

### How Agents Use MCP Resources

Agents can retrieve data from MCP resources:

**Example: CSV Data Analysis**

```
You: "What's the average revenue from the Q1 sales data?"

Agent: Let me retrieve the Q1 sales data...
[Agent retrieves: sales/q1-2025.csv resource]

Agent: Based on the Q1 sales data:
- Total Revenue: $1.2M
- Average Deal Size: $24,000
- Number of Deals: 50
```

For CSV resources, the data is automatically:
- Retrieved from the MCP server
- Parsed and indexed
- Made available for semantic search

### How Agents Use MCP Prompts

Agents can leverage pre-configured prompt templates:

**Example: Code Review Template**

```
You: "Review this code for me: [code snippet]"

Agent: [Uses MCP prompt template "code-review"]

Agent: Here's my code review:

**Strengths:**
- Clear variable names
- Proper error handling

**Areas for Improvement:**
- Consider adding input validation
- Could benefit from unit tests
...
```

## Example Conversations

### Example 1: Research with GitHub MCP

**Setup:** Agent with GitHub MCP integration assigned

```
You: "Find recent issues in our main repository about performance"

Agent: I'll search GitHub for performance-related issues...
[Executes: github_search_issues(repo="main", query="performance", state="open")]

Agent: I found 3 open performance issues:

1. Issue #142: "Slow database queries on user dashboard"
   - Opened: 2 days ago
   - Priority: High
   - Assigned to: @john

2. Issue #138: "API response time exceeds 2 seconds"
   - Opened: 1 week ago
   - Priority: Medium
   - Assigned to: @sarah

3. Issue #135: "Memory leak in background jobs"
   - Opened: 2 weeks ago
   - Priority: High
   - In progress

Would you like me to analyze any of these issues in detail?
```

### Example 2: Data Analysis with CSV Resource

**Setup:** Agent with Data MCP integration (provides CSV resources)

```
You: "What were our top performing products last month?"

Agent: Let me check the sales data...
[Retrieves: resources/monthly-sales-2025-09.csv]

Agent: Based on last month's sales data, here are the top 5 products:

1. **Product A** - $245K revenue (28% of total)
   - 1,234 units sold
   - Average price: $199

2. **Product B** - $198K revenue (23% of total)
   - 890 units sold
   - Average price: $222

3. **Product C** - $167K revenue (19% of total)
   - 2,100 units sold
   - Average price: $80

[Additional analysis...]

Would you like me to compare this to previous months?
```

### Example 3: Workflow Automation

**Setup:** Agent with multiple MCP integrations

```
You: "Create a summary of yesterday's GitHub activity and send it to the team"

Agent: I'll gather the activity and prepare a summary...
[Executes: github_get_commits(since="yesterday")]
[Executes: github_get_pull_requests(updated="yesterday")]

Agent: Here's yesterday's GitHub activity summary:

**Commits:** 12 commits across 5 repositories
**Pull Requests:**
- 3 opened
- 2 merged
- 1 closed

[Executes: send_notification(channel="team", message="...")]

Agent: I've sent the summary to the #team channel. Is there anything specific you'd like me to highlight?
```

## Troubleshooting

### Integration Not Working

**Symptom:** Agent doesn't use MCP tools/resources

**Solutions:**
1. **Check Assignment**: Ensure the integration is assigned to the agent
2. **Check Status**: Verify the integration is enabled (contact admin if disabled)
3. **Check Conversation Context**: Agent uses tools based on relevance
4. **Ask Explicitly**: Try saying "Use the GitHub integration to search..."

### Tool Execution Fails

**Symptom:** Agent says "Tool execution failed"

**Possible Causes:**
1. **Invalid Parameters**: Tool requires specific parameter format
2. **Server Issue**: MCP server is temporarily unavailable
3. **Authentication**: Integration credentials may have expired
4. **Rate Limiting**: Too many requests in short time

**What to Do:**
- Try again in a few moments
- Contact your admin if the issue persists
- Check if other tools from the same integration work

### Resource Not Found

**Symptom:** Agent can't retrieve a specific resource

**Possible Causes:**
1. **Wrong URI**: Resource path may have changed
2. **Permissions**: Resource may require additional permissions
3. **Server Issue**: MCP server is temporarily unavailable

**What to Do:**
- Verify the resource name/path with your admin
- Check if other resources from the same integration work
- Try again later if it's a temporary server issue

### CSV Data Not Updating

**Symptom:** Agent uses old CSV data

**Explanation:**
- CSV resources are cached after first retrieval
- Updates to the CSV on the MCP server require re-retrieval

**Solution:**
- Ask the agent to "fetch the latest version of [resource name]"
- Contact your admin to manually refresh the resource if needed

## Best Practices

### 1. Be Specific

Help the agent choose the right tool:

❌ **Vague:** "Get some information"
✅ **Specific:** "Search GitHub for issues about authentication"

### 2. Provide Context

Give the agent enough information:

❌ **Insufficient:** "Check the data"
✅ **Better:** "Check the Q1 sales data for revenue trends"

### 3. Iterate

Refine your requests based on results:

```
You: "Find GitHub issues about performance"
Agent: [Shows 20 results]
You: "Only show high-priority performance issues from last week"
Agent: [Shows filtered results]
```

### 4. Combine Capabilities

Leverage multiple integrations:

```
You: "Search GitHub for bug reports, then create a summary CSV of the top 10"
Agent: [Uses GitHub MCP to search, then Data MCP to generate CSV]
```

## Understanding Agent Behavior

### When Agents Use Tools

Agents decide to use MCP tools when:
- User request clearly needs external data/action
- Tool description matches the request
- Tool parameters can be inferred from context

### When Agents Don't Use Tools

Agents may not use tools if:
- Question can be answered with existing knowledge
- No tool matches the request
- Required parameters are unclear

**Tip:** Be explicit if you want a specific tool used: "Use the GitHub integration to..."

### Tool Execution Visibility

During tool execution, you'll see:
1. Agent indicates it's using a tool
2. Brief delay while tool executes
3. Agent incorporates results into response

Some tools execute quickly (< 1 second), others may take longer (5-10 seconds).

## Getting Help

If you encounter issues with MCP integrations:

1. **Try Again**: Some issues are temporary
2. **Contact Your Admin**: They can check integration status and logs
3. **Report Specific Errors**: Include the exact error message and what you were trying to do
4. **Check This Guide**: Review troubleshooting section above

## Next Steps

Now that you know how to use MCP integrations:

1. **Experiment**: Try different integrations with your agents
2. **Share Use Cases**: Tell your team about useful MCP capabilities
3. **Provide Feedback**: Let admins know which integrations are most valuable

## References

- [Admin Guide: MCP Integration Setup](../admin/mcp-integration-setup.md)
- [Troubleshooting: MCP Integration Issues](../troubleshooting/mcp-integration.md)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
