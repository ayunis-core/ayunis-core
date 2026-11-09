import { ToolFactory } from 'src/domain/tools/application/tool.factory';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

// The pane implements these calls against Office.js, so their names and
// parameters are a contract with the Outlook client.
describe('Outlook tools', () => {
  const factory = new ToolFactory();
  const create = (type: ToolType): Tool => factory.createTool({ type });

  const validCalls: [ToolType, Record<string, unknown>][] = [
    [ToolType.OUTLOOK_READ_EMAIL, {}],
    [ToolType.OUTLOOK_READ_ATTACHMENT, { attachmentId: 'AAMkAD1=' }],
    [ToolType.OUTLOOK_DRAFT_EMAIL, { subject: 'Re: Antrag', body: 'Hallo' }],
    [ToolType.OUTLOOK_MOVE_EMAIL_TO_COMPOSER, { body: 'Hallo' }],
    [ToolType.OUTLOOK_SAVE_EMAIL_TO_DRAFT, {}],
  ];

  it.each(validCalls)('%s is named outlook__… after its type', (type) => {
    const tool = create(type);

    expect(tool.name).toBe(type);
    expect(tool.name).toMatch(/^outlook__[a-z_]+$/);
  });

  it.each(validCalls)('%s accepts a valid call', (type, params) => {
    expect(create(type).validateParams(params)).toEqual(params);
  });

  it.each(validCalls)(
    '%s rejects parameters it does not define',
    (type, params) => {
      expect(() =>
        create(type).validateParams({ ...params, sendNow: true }),
      ).toThrow("unknown parameter 'sendNow'");
    },
  );

  it('reads an attachment by name as well as by id', () => {
    const tool = create(ToolType.OUTLOOK_READ_ATTACHMENT);

    expect(tool.validateParams({ name: 'Antrag.pdf' })).toEqual({
      name: 'Antrag.pdf',
    });
  });

  it('rejects an attachment call that names neither id nor name', () => {
    const tool = create(ToolType.OUTLOOK_READ_ATTACHMENT);

    expect(() => tool.validateParams({})).toThrow(
      "pass either 'attachmentId' or 'name'",
    );
    expect(() => tool.validateParams({ name: '' })).toThrow();
  });

  it.each([
    ToolType.OUTLOOK_DRAFT_EMAIL,
    ToolType.OUTLOOK_MOVE_EMAIL_TO_COMPOSER,
  ])('%s requires a body', (type) => {
    expect(() => create(type).validateParams({})).toThrow(
      "missing required parameter 'body'",
    );
  });

  it('marks only the read tools as returning personal data', () => {
    const returningPii = validCalls
      .map(([type]) => create(type))
      .filter((tool) => tool.returnsPii)
      .map((tool) => tool.name);

    expect(returningPii).toEqual([
      ToolType.OUTLOOK_READ_EMAIL,
      ToolType.OUTLOOK_READ_ATTACHMENT,
    ]);
  });
});
