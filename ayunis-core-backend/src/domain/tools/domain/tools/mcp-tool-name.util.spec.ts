import { sanitizeMcpToolName } from './mcp-tool-name.util';

describe('sanitizeMcpToolName', () => {
  it('keeps already-valid names unchanged', () => {
    expect(sanitizeMcpToolName('search_documents')).toBe('search_documents');
    expect(sanitizeMcpToolName('API-post-page')).toBe('API-post-page');
  });

  it('replaces spaces with underscores', () => {
    expect(sanitizeMcpToolName('Project README')).toBe('Project_README');
  });

  it('replaces dots, colons and slashes with underscores', () => {
    expect(sanitizeMcpToolName('notion.search')).toBe('notion_search');
    expect(sanitizeMcpToolName('fs:read/file')).toBe('fs_read_file');
  });

  it('truncates names longer than 64 characters', () => {
    expect(sanitizeMcpToolName('a'.repeat(80))).toBe('a'.repeat(64));
  });

  it('falls back to a placeholder for names without valid characters', () => {
    expect(sanitizeMcpToolName('äöü')).toBe('mcp_tool');
    expect(sanitizeMcpToolName('')).toBe('mcp_tool');
  });
});
