import type { BudgetWarningTemplateContent } from '../../../domain/email-template.entity';
import { BudgetWarningScope } from '../../../domain/value-objects/budget-warning-scope.enum';
import {
  budgetWarningHtml,
  budgetWarningText,
} from './budget-warning.template';

function content(
  overrides: Partial<BudgetWarningTemplateContent> = {},
): BudgetWarningTemplateContent {
  return {
    recipientName: 'Andrea Admin',
    recipientEmail: 'andrea@stadt-musterhausen.de',
    scope: BudgetWarningScope.ORG,
    targetName: 'Stadt Musterhausen',
    threshold: '80',
    productName: 'Ayunis Core',
    currentYear: '2026',
    logoUrl: 'https://app.example/email/logo.png',
    teamUrl: 'https://app.example/email/team.png',
    settingsUrl: 'https://app.example/admin-settings/usage',
    ...overrides,
  };
}

describe('budget-warning template', () => {
  describe('warning variant (below 100%)', () => {
    it('renders a percentage warning in plain text', () => {
      const text = budgetWarningText(content());

      expect(text).toContain('Ayunis Core – Budgetwarnung');
      expect(text).toContain(
        'mindestens 80% Ihres Organisationsbudgets sind aufgebraucht.',
      );
      expect(text).toContain(
        'Sobald das Budget aufgebraucht ist, sind nicht mehr alle Modelle im Chat verfügbar.',
      );
    });

    it('renders valid HTML with the warning headline', () => {
      const result = budgetWarningHtml(content());

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('Budgetwarnung');
      expect(result.html).toContain(
        'mindestens <strong>80%</strong> Ihres <strong>Organisationsbudgets</strong> sind aufgebraucht.',
      );
    });
  });

  describe('exhausted variant (100%)', () => {
    it('announces org budget exhaustion in the present tense', () => {
      const text = budgetWarningText(content({ threshold: '100' }));

      expect(text).toContain('Ayunis Core – Budget aufgebraucht');
      expect(text).toContain(
        'Ihr Organisationsbudget ist vollständig aufgebraucht.',
      );
      expect(text).toContain(
        'Es sind nicht mehr alle Modelle im Chat verfügbar.',
      );
      expect(text).not.toContain('mindestens');
    });

    it('uses the nominative user phrase', () => {
      const text = budgetWarningText(
        content({
          threshold: '100',
          scope: BudgetWarningScope.USER,
          targetName: 'Jane Doe',
        }),
      );

      expect(text).toContain(
        'das monatliche Budget von Jane Doe ist vollständig aufgebraucht.',
      );
    });

    it('uses the nominative team phrase', () => {
      const text = budgetWarningText(
        content({
          threshold: '100',
          scope: BudgetWarningScope.TEAM,
          targetName: 'Engineering',
        }),
      );

      expect(text).toContain(
        'das monatliche Budget des Teams Engineering ist vollständig aufgebraucht.',
      );
    });

    it('renders valid HTML with the exhausted headline', () => {
      const result = budgetWarningHtml(content({ threshold: '100' }));

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('Budget aufgebraucht');
      expect(result.html).toContain(
        'Ihr <strong>Organisationsbudget</strong> ist vollständig aufgebraucht.',
      );
    });
  });
});
