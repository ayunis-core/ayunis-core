import { CreateRoutineTool } from './create-routine-tool.entity';
import { EditRoutineTool } from './edit-routine-tool.entity';

const ROUTINE_ID = '44444444-4444-4444-8444-444444444444';

describe('routine widget tools', () => {
  const create = (params: Record<string, unknown>) =>
    new CreateRoutineTool().validateParams({
      name: 'Gesetzblatt NRW',
      prompt: 'Prüfe das heutige Gesetz- und Verordnungsblatt.',
      daily_time: '07:00',
      ...params,
    });
  const edit = (params: Record<string, unknown>) =>
    new EditRoutineTool(
      new Map([[ROUTINE_ID, '"Gesetzblatt NRW"']]),
    ).validateParams({
      routine_id: ROUTINE_ID,
      name: '',
      prompt: '',
      daily_time: '',
      change_summary: 'Nur amtliche Quellen',
      ...params,
    });

  it('proposes a routine limited to the domains the user named', () => {
    expect(
      create({ internet_access: 'allowlist', allowed_domains: ['nrw.de'] }),
    ).toMatchObject({
      internet_access: 'allowlist',
      allowed_domains: ['nrw.de'],
    });
  });

  it('tells the model when a proposal would be rejected on saving', () => {
    expect(() => create({ internet_access: 'allowlist' })).toThrow(
      /allowed_domains: The allowlist mode needs at least one allowed domain/,
    );
    expect(() =>
      // eslint-disable-next-line sonarjs/no-hardcoded-ip -- the rejected input
      create({ internet_access: 'allowlist', allowed_domains: ['10.0.0.1'] }),
    ).toThrow(/allowed_domains: "10.0.0.1" is an IP address/);
  });

  it('lets an edit leave the internet access and the domains as they are', () => {
    expect(edit({})).not.toHaveProperty('internet_access');
    expect(() => edit({ allowed_domains: ['*.nrw.de'] })).toThrow(/wildcard/);
  });
});
