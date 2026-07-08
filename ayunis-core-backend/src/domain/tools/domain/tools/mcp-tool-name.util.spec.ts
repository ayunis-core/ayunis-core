import {
  filterDuplicateToolNames,
  sanitizeMcpToolName,
} from './mcp-tool-name.util';

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

describe('filterDuplicateToolNames', () => {
  it('keeps the first tool for each name and reports the rest', () => {
    const first = { name: 'search' };
    const second = { name: 'search' };
    const other = { name: 'fetch' };

    const { unique, duplicates } = filterDuplicateToolNames([
      first,
      second,
      other,
    ]);

    expect(unique).toEqual([first, other]);
    expect(duplicates).toEqual([second]);
  });

  it('treats reserved names as already taken', () => {
    const mcpTool = { name: 'code_execution' };
    const other = { name: 'notion_search' };

    const { unique, duplicates } = filterDuplicateToolNames(
      [mcpTool, other],
      new Set(['code_execution']),
    );

    expect(unique).toEqual([other]);
    expect(duplicates).toEqual([mcpTool]);
  });

  it('returns no duplicates for distinct names', () => {
    const tools = [{ name: 'a' }, { name: 'b' }];
    expect(filterDuplicateToolNames(tools)).toEqual({
      unique: tools,
      duplicates: [],
    });
  });
});
