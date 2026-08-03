import { registerAs } from '@nestjs/config';

export const mcpConfig = registerAs('mcp', () => ({
  locaboo4Url: process.env.LOCABOO_4_MCP_URL,
  backendBaseUrl: process.env.BACKEND_BASEURL || 'http://localhost:3000',
  frontendBaseUrl: process.env.FRONTEND_BASEURL || 'http://localhost:3001',
}));
