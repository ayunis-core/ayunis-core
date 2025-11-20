import { registerAs } from '@nestjs/config';

export const mcpConfig = registerAs('mcp', () => ({
  locaboo4Url: process.env.LOCABOO_4_MCP_URL,
  legalMcpUrl: process.env.LEGAL_MCP_URL,
}));
