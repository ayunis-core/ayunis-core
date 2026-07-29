import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SendEmailUseCase } from 'src/common/emails/application/use-cases/send-email/send-email.use-case';
import { RenderTemplateUseCase } from 'src/common/email-templates/application/use-cases/render-template/render-template.use-case';
import { BudgetWarningTemplate } from 'src/common/email-templates/domain/email-template.entity';
import { BudgetWarningScope } from 'src/common/email-templates/domain/value-objects/budget-warning-scope.enum';
import { SendBudgetWarningEmailUseCase } from './send-budget-warning-email.use-case';
import { SendBudgetWarningEmailCommand } from './send-budget-warning-email.command';
import {
  BudgetWarningEmailRenderingFailedError,
  BudgetWarningEmailSendingFailedError,
} from '../../budget-alerts.errors';

describe('SendBudgetWarningEmailUseCase', () => {
  let useCase: SendBudgetWarningEmailUseCase;
  let sendEmail: { execute: jest.Mock };
  let renderTemplate: { execute: jest.Mock };

  beforeEach(async () => {
    sendEmail = { execute: jest.fn().mockResolvedValue(undefined) };
    renderTemplate = {
      execute: jest.fn().mockReturnValue({
        html: '<html></html>',
        text: 'text',
        subject: 'Limitwarnung: Jane Doe hat 80 % des Limits erreicht',
      }),
    };
    const config = {
      get: jest.fn((key: string) =>
        key === 'app.frontend.baseUrl'
          ? 'https://app.example'
          : '/email-assets',
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendBudgetWarningEmailUseCase,
        { provide: SendEmailUseCase, useValue: sendEmail },
        { provide: RenderTemplateUseCase, useValue: renderTemplate },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    useCase = module.get(SendBudgetWarningEmailUseCase);
  });

  const command = new SendBudgetWarningEmailCommand({
    recipientName: 'Andrea Admin',
    recipientEmail: 'andrea@stadt-musterhausen.de',
    scope: BudgetWarningScope.USER,
    targetId: '22222222-2222-2222-2222-222222222222',
    targetName: 'Jane Doe',
    threshold: 80,
  });

  const renderedTemplate = (): BudgetWarningTemplate => {
    const rendered = renderTemplate.execute.mock.calls[0][0] as {
      template: BudgetWarningTemplate;
    };
    return rendered.template;
  };

  it('renders a budget-warning template and sends it to the recipient', async () => {
    await useCase.execute(command);

    const template = renderedTemplate();
    expect(template).toBeInstanceOf(BudgetWarningTemplate);
    expect(template.content.threshold).toBe('80');

    expect(sendEmail.execute).toHaveBeenCalledTimes(1);
    const sent = sendEmail.execute.mock.calls[0][0];
    expect(sent.to).toBe('andrea@stadt-musterhausen.de');
  });

  it('links user warnings to the users settings page', async () => {
    await useCase.execute(command);

    expect(renderedTemplate().content.settingsUrl).toBe(
      'https://app.example/admin-settings/users',
    );
  });

  it('links team warnings to the team detail page', async () => {
    await useCase.execute(
      new SendBudgetWarningEmailCommand({
        ...command,
        scope: BudgetWarningScope.TEAM,
        targetName: 'Bauamt',
      }),
    );

    expect(renderedTemplate().content.settingsUrl).toBe(
      'https://app.example/admin-settings/teams/22222222-2222-2222-2222-222222222222',
    );
  });

  it('links org warnings to the usage settings page', async () => {
    await useCase.execute(
      new SendBudgetWarningEmailCommand({
        ...command,
        scope: BudgetWarningScope.ORG,
        targetName: '',
      }),
    );

    expect(renderedTemplate().content.settingsUrl).toBe(
      'https://app.example/admin-settings/usage',
    );
  });

  it('uses the subject produced by the template renderer', async () => {
    await useCase.execute(command);

    const sent = sendEmail.execute.mock.calls[0][0];
    expect(sent.subject).toBe(
      'Limitwarnung: Jane Doe hat 80 % des Limits erreicht',
    );
  });

  it('fails with a rendering error when the renderer returns no subject', async () => {
    renderTemplate.execute.mockReturnValue({
      html: '<html></html>',
      text: 'text',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      BudgetWarningEmailRenderingFailedError,
    );
    expect(sendEmail.execute).not.toHaveBeenCalled();
  });

  it('wraps transport failures in a domain error', async () => {
    sendEmail.execute.mockRejectedValue(new Error('smtp down'));

    await expect(useCase.execute(command)).rejects.toThrow(
      BudgetWarningEmailSendingFailedError,
    );
  });
});
