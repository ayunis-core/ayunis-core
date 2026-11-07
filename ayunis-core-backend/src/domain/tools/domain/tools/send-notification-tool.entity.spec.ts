import { randomUUID } from 'crypto';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  SendNotificationOrigin,
  SendNotificationTool,
} from './send-notification-tool.entity';

describe('SendNotificationTool', () => {
  const tool = new SendNotificationTool(
    new SendNotificationOrigin(randomUUID()),
  );
  const valid = {
    headline: 'Neue Verordnung zur Grundsteuer',
    subheadline: 'GVBl. NRW vom 07.11.2026',
    body: 'Die [Verordnung](https://recht.nrw.de/gvbl/2026-11-07) ändert die Hebesätze ab 2027.',
  };

  it('is named after its tool type', () => {
    expect(tool.name).toBe(ToolType.SEND_NOTIFICATION);
  });

  it('accepts a headline, a subheadline and a markdown body', () => {
    expect(tool.validateParams(valid)).toEqual(valid);
  });

  it.each(['headline', 'subheadline', 'body'] as const)(
    'rejects a call without a %s',
    (field) => {
      const incomplete: Record<string, unknown> = { ...valid };
      delete incomplete[field];
      expect(() => tool.validateParams(incomplete)).toThrow();
    },
  );

  it('rejects a headline longer than the inbox shows', () => {
    expect(() =>
      tool.validateParams({ ...valid, headline: 'A'.repeat(201) }),
    ).toThrow();
  });

  it('tells the model to notify only about important findings', () => {
    expect(tool.description).toMatch(/important/i);
  });
});
