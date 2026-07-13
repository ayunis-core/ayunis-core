import { MjmlHandler } from './mjml.handler';
import {
  BudgetWarningTemplate,
  type BudgetWarningTemplateContent,
} from '../../domain/email-template.entity';
import { BudgetWarningScope } from '../../domain/value-objects/budget-warning-scope.enum';

describe('MjmlHandler — budget warning', () => {
  const handler = new MjmlHandler();

  const baseContent: BudgetWarningTemplateContent = {
    recipientName: 'Andrea Admin',
    recipientEmail: 'andrea@stadt-musterhausen.de',
    scope: BudgetWarningScope.ORG,
    targetName: 'Stadt Musterhausen',
    threshold: '80',
    productName: 'Ayunis Core',
    currentYear: '2026',
    logoUrl: 'https://assets.example/logo.png',
    teamUrl: 'https://assets.example/team.png',
    settingsUrl: 'https://app.example/settings/credit-limits',
  };

  it('renders the org-scope warning with threshold and settings link', () => {
    const rendered = handler.renderTemplate(
      new BudgetWarningTemplate(baseContent),
    );

    expect(rendered.html).toContain('Budgetwarnung');
    expect(rendered.html).toContain('80%');
    expect(rendered.html).toContain('Organisationsbudgets');
    expect(rendered.html).toContain(
      'Dies ist eine automatische Benachrichtigung.',
    );
    expect(rendered.html).toContain(baseContent.settingsUrl);
    expect(rendered.text).toContain(
      'mindestens 80% Ihres Organisationsbudgets',
    );
    expect(rendered.text).toContain(baseContent.settingsUrl);
  });

  it('names the affected user for the user scope', () => {
    const rendered = handler.renderTemplate(
      new BudgetWarningTemplate({
        ...baseContent,
        scope: BudgetWarningScope.USER,
        targetName: 'Jane Doe',
        threshold: '50',
      }),
    );

    expect(rendered.html).toContain('Budgets von <strong>Jane Doe</strong>');
    expect(rendered.text).toContain(
      'mindestens 50% des monatlichen Budgets von Jane Doe',
    );
  });

  it('names the affected team for the team scope', () => {
    const rendered = handler.renderTemplate(
      new BudgetWarningTemplate({
        ...baseContent,
        scope: BudgetWarningScope.TEAM,
        targetName: 'Marketing',
      }),
    );

    expect(rendered.html).toContain(
      'Budgets des Teams <strong>Marketing</strong>',
    );
    expect(rendered.text).toContain(
      'mindestens 80% des monatlichen Budgets des Teams Marketing',
    );
  });

  it('keeps user-controlled names on a single line in the plain-text variant', () => {
    const rendered = handler.renderTemplate(
      new BudgetWarningTemplate({
        ...baseContent,
        scope: BudgetWarningScope.USER,
        recipientName: 'Andrea\r\nAdmin',
        targetName: 'Jane\n\nBitte hier klicken: http://evil.example',
      }),
    );

    expect(rendered.text).toContain('Hallo Andrea Admin,');
    expect(rendered.text).toContain(
      'Budgets von Jane Bitte hier klicken: http://evil.example sind aufgebraucht',
    );
  });
});
