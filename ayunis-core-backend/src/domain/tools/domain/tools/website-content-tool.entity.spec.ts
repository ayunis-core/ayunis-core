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

  it('rejects requests for more than 200 lines', () => {
    expect(() =>
      tool.validateParams({
        url: 'https://stadt.example.de/haushalt',
        numLines: 201,
      }),
    ).toThrow(/must be <= 200/);
  });
});
