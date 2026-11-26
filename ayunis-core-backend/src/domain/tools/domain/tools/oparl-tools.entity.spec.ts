import { OparlListTool } from './oparl-list-tool.entity';
import { OparlSearchTool } from './oparl-search-tool.entity';
import { OparlToolScope } from './oparl-tool-scope';

const scope = new OparlToolScope([
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Gemeinde Musterstadt',
    systemName: 'Ratsinfo',
  },
]);

describe('OParl tools', () => {
  describe('oparl_search', () => {
    const tool = new OparlSearchTool(scope);

    it('takes a date range of calendar days, the result types and the page', () => {
      expect(
        tool.validateParams({
          queries: [' Kita Erweiterung '],
          from: '2024-01-01',
          to: '2024-12-31',
          paperType: 'Antrag',
          types: ['agenda_item', 'file', 'agenda_item'],
          page: 2,
        }),
      ).toEqual({
        queries: ['Kita Erweiterung'],
        bodyIds: [],
        filters: {
          from: '2024-01-01',
          to: '2024-12-31',
          paperType: 'Antrag',
          sources: ['agenda_item', 'file'],
        },
        page: 2,
      });
      expect(tool.validateParams({ queries: ['Kita'] }).page).toBe(1);
    });

    it.each([
      [{ from: '2024-02-30' }, /'from' must be a date as YYYY-MM-DD/],
      [{ from: '2024-13-01' }, /'from' must be a date as YYYY-MM-DD/],
      [{ to: '2024-03-01T10:00:00Z' }, /'to' must be a date as YYYY-MM-DD/],
      [
        { from: '2024-05-01', to: '2024-04-01' },
        /'from' must not be after 'to'/,
      ],
      [{ queries: ['   '] }, /must not contain empty queries/],
      [{ paperType: '   ' }, /'paperType' must not be blank/],
      [{ types: ['protocol'] }, /types/],
      [{ page: 0 }, /page/],
    ])('refuses %j with an error the model can act on', (params, message) => {
      expect(() =>
        tool.validateParams({ queries: ['Kita'], ...params }),
      ).toThrow(message);
    });
  });

  describe('oparl_list', () => {
    const tool = new OparlListTool(scope);

    it('refuses a date range for anything but meetings and an organization filter for organizations', () => {
      expect(() =>
        tool.validateParams({ type: 'persons', from: '2024-01-01' }),
      ).toThrow("'from' and 'to' apply to meetings only");
      expect(() =>
        tool.validateParams({
          type: 'organizations',
          organizationId: '33333333-3333-4333-8333-333333333333',
        }),
      ).toThrow("'organizationId' applies to meetings and persons only");
    });

    it('refuses a blank name instead of listing without the filter', () => {
      expect(() =>
        tool.validateParams({ type: 'persons', name: '   ' }),
      ).toThrow("'name' must not be blank");
    });

    it('starts at the first page', () => {
      expect(tool.validateParams({ type: 'meetings' })).toMatchObject({
        type: 'meetings',
        page: 1,
      });
    });
  });
});
