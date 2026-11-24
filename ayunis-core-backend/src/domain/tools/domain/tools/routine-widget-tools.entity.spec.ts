import { CreateRoutineTool } from './create-routine-tool.entity';
import { EditRoutineTool } from './edit-routine-tool.entity';

const ROUTINE_ID = '44444444-4444-4444-8444-444444444444';

describe('routine widget tools', () => {
  const create = (params: Record<string, unknown>) =>
    new CreateRoutineTool().validateParams({
      name: 'Gesetzblatt NRW',
      prompt: 'Prüfe das heutige Gesetz- und Verordnungsblatt.',
      schedule: { frequency: 'daily', time: '07:00' },
      internet_access: 'off',
      ...params,
    });
  const edit = (params: Record<string, unknown>) =>
    new EditRoutineTool(
      new Map([[ROUTINE_ID, '"Gesetzblatt NRW"']]),
    ).validateParams({
      routine_id: ROUTINE_ID,
      name: '',
      prompt: '',
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

  it('proposes a weekly routine on the days the user named', () => {
    expect(
      create({
        schedule: { frequency: 'weekly', time: '08:00', weekdays: [1] },
      }),
    ).toMatchObject({
      schedule: { frequency: 'weekly', time: '08:00', weekdays: [1] },
    });
  });

  it('tells the model when a schedule would be rejected on saving', () => {
    expect(() =>
      create({ schedule: { frequency: 'weekly', time: '08:00' } }),
    ).toThrow(/schedule\.weekdays: weekly needs at least one weekday/);
    expect(() =>
      create({
        schedule: { frequency: 'daily', time: '08:00', month_day: 1 },
      }),
    ).toThrow(
      /schedule\.month_day: a month day is only allowed with the monthly frequency/,
    );
    expect(() =>
      create({
        schedule: { frequency: 'monthly', time: '08:00', month_day: 31 },
      }),
    ).toThrow(/schedule\.month_day/);
  });

  it('lets an edit leave the schedule as it is, or replace it as a whole', () => {
    expect(edit({})).not.toHaveProperty('schedule');
    expect(
      edit({
        schedule: { frequency: 'monthly', time: '08:00', month_day: 'last' },
      }),
    ).toMatchObject({
      schedule: { frequency: 'monthly', time: '08:00', month_day: 'last' },
    });
    expect(() =>
      edit({ schedule: { frequency: 'monthly', time: '08:00' } }),
    ).toThrow(/schedule\.month_day/);
  });
});
