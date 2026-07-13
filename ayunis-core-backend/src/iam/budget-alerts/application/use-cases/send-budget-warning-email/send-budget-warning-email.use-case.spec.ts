import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SendEmailUseCase } from 'src/common/emails/application/use-cases/send-email/send-email.use-case';
import { RenderTemplateUseCase } from 'src/common/email-templates/application/use-cases/render-template/render-template.use-case';
import { BudgetWarningTemplate } from 'src/common/email-templates/domain/email-template.entity';
import { BudgetWarningScope } from 'src/common/email-templates/domain/value-objects/budget-warning-scope.enum';
import { SendBudgetWarningEmailUseCase } from './send-budget-warning-email.use-case';
import { SendBudgetWarningEmailCommand } from './send-budget-warning-email.command';
import { BudgetWarningEmailSendingFailedError } from '../../budget-alerts.errors';

describe('SendBudgetWarningEmailUseCase', () => {
  let useCase: SendBudgetWarningEmailUseCase;
  let sendEmail: { execute: jest.Mock };
  let renderTemplate: { execute: jest.Mock };

  beforeEach(async () => {
    sendEmail = { execute: jest.fn().mockResolvedValue(undefined) };
    renderTemplate = {
      execute: jest
        .fn()
        .mockReturnValue({ html: '<html></html>', text: 'text' }),
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
    targetName: 'Jane Doe',
    threshold: 80,
  });

  it('renders a budget-warning template and sends it to the recipient', async () => {
    await useCase.execute(command);

    const rendered = renderTemplate.execute.mock.calls[0][0] as {
      template: BudgetWarningTemplate;
    };
    expect(rendered.template).toBeInstanceOf(BudgetWarningTemplate);
    expect(rendered.template.content.threshold).toBe('80');
    expect(rendered.template.content.settingsUrl).toBe(
      'https://app.example/admin-settings/usage',
    );

    expect(sendEmail.execute).toHaveBeenCalledTimes(1);
    const sent = sendEmail.execute.mock.calls[0][0];
    expect(sent.to).toBe('andrea@stadt-musterhausen.de');
    expect(sent.subject).toBe('Budgetwarnung: 80% des Budgets erreicht');
  });

  it('uses the exhausted subject at the 100% threshold', async () => {
    await useCase.execute(
      new SendBudgetWarningEmailCommand({
        recipientName: 'Andrea Admin',
        recipientEmail: 'andrea@stadt-musterhausen.de',
        scope: BudgetWarningScope.ORG,
        targetName: 'Stadt Musterhausen',
        threshold: 100,
      }),
    );

    const sent = sendEmail.execute.mock.calls[0][0];
    expect(sent.subject).toBe('Budget vollständig aufgebraucht');
  });

  it('wraps transport failures in a domain error', async () => {
    sendEmail.execute.mockRejectedValue(new Error('smtp down'));

    await expect(useCase.execute(command)).rejects.toThrow(
      BudgetWarningEmailSendingFailedError,
    );
  });
});
