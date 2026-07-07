import { MjmlHandler } from './mjml.handler';
import {
  BudgetWarningTemplate,
  type BudgetWarningTemplateContent,
} from '../../domain/email-template.entity';

describe('MjmlHandler — budget warning', () => {
  const handler = new MjmlHandler();

  const baseContent: BudgetWarningTemplateContent = {
    recipientName: 'Andrea Admin',
    recipientEmail: 'andrea@stadt-musterhausen.de',
    scope: 'org',
    targetName: 'Stadt Musterhausen',
    threshold: '80',
    percentUsed: '83',
    creditsUsed: '8.300',
    monthlyCredits: '10.000',
    productName: 'Ayunis Core',
    currentYear: '2026',
    logoUrl: 'https://assets.example/logo.png',
    teamUrl: 'https://assets.example/team.png',
    settingsUrl: 'https://app.example/settings/credit-limits',
  };

  it('renders the org-scope warning with threshold, usage and settings link', () => {
    const rendered = handler.renderTemplate(
      new BudgetWarningTemplate(baseContent),
    );

    expect(rendered.html).toContain('Budgetwarnung');
    expect(rendered.html).toContain('80%');
    expect(rendered.html).toContain('83%');
    expect(rendered.html).toContain('Organisationsbudget');
    expect(rendered.html).toContain(baseContent.settingsUrl);
    expect(rendered.text).toContain('8.300 von 10.000 Credits');
    expect(rendered.text).toContain(baseContent.settingsUrl);
  });

  it('names the affected user for the user scope', () => {
    const rendered = handler.renderTemplate(
      new BudgetWarningTemplate({
        ...baseContent,
        scope: 'user',
        targetName: 'Jane Doe',
        threshold: '50',
        percentUsed: '55',
      }),
    );

    expect(rendered.html).toContain('Budget von <strong>Jane Doe</strong>');
    expect(rendered.text).toContain('das monatliche Budget von Jane Doe');
  });

  it('names the affected team for the team scope', () => {
    const rendered = handler.renderTemplate(
      new BudgetWarningTemplate({
        ...baseContent,
        scope: 'team',
        targetName: 'Marketing',
      }),
    );

    expect(rendered.html).toContain(
      'Budget des Teams <strong>Marketing</strong>',
    );
    expect(rendered.text).toContain(
      'das monatliche Budget des Teams Marketing',
    );
  });
});
