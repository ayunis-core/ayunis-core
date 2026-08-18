import { ToolType } from '../value-objects/tool-type.enum';
import { CreateEmailTool } from './create-email-tool.entity';
import { ReadEmailTool } from './read-email-tool.entity';
import { UpdateEmailTool } from './update-email-tool.entity';

describe('email artifact tools', () => {
  it('exposes create, update, and read tool contracts', () => {
    expect(new CreateEmailTool().type).toBe(ToolType.CREATE_EMAIL);
    expect(new UpdateEmailTool().type).toBe(ToolType.UPDATE_EMAIL);
    expect(new ReadEmailTool().type).toBe(ToolType.READ_EMAIL);
  });

  it('validates recipient arrays on create', () => {
    const tool = new CreateEmailTool();

    expect(() =>
      tool.validateParams({
        subject: 'Subject',
        to: ['not-an-email'],
        body: 'Body',
      }),
    ).toThrow();

    expect(() =>
      tool.validateParams({
        subject: 'Subject',
        to: [],
        body: 'Body',
      }),
    ).toThrow();
  });

  it('accepts anonymized email recipient tokens for later de-anonymization', () => {
    expect(
      new CreateEmailTool().validateParams({
        subject: 'Subject',
        to: ['{{pii:EMAIL_ADDRESS_1}}'],
        body: 'Body',
      }),
    ).toMatchObject({ to: ['{{pii:EMAIL_ADDRESS_1}}'] });
  });
});
