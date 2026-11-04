import { WebsiteContentTool } from './website-content-tool.entity';

describe('WebsiteContentTool', () => {
  const tool = new WebsiteContentTool();

  it('accepts content and link pagination requests', () => {
    expect(
      tool.validateParams({
        url: 'https://stadt.example.de/haushalt',
        section: 'links',
        startLine: 201,
        numLines: 50,
      }),
    ).toMatchObject({ section: 'links', startLine: 201, numLines: 50 });
  });

  it('rejects an unknown section', () => {
    expect(() =>
      tool.validateParams({
        url: 'https://stadt.example.de/haushalt',
        section: 'metadata',
      }),
    ).toThrow(/must be one of: content, links/);
  });

  it('rejects requests for more than 2000 lines', () => {
    expect(() =>
      tool.validateParams({
        url: 'https://stadt.example.de/haushalt',
        numLines: 2_001,
      }),
    ).toThrow(/must be <= 2000/);
  });
  it('accepts a 500-line page', () => {
    expect(
      tool.validateParams({
        url: 'https://municipality.example/meeting',
        numLines: 500,
      }).numLines,
    ).toBe(500);
  });
});
