import type { BudgetWarningTemplateContent } from '../../../domain/email-template.entity';
import { BudgetWarningScope } from '../../../domain/value-objects/budget-warning-scope.enum';
import {
  budgetWarningHtml,
  budgetWarningSubject,
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
  describe('org budget at 50%', () => {
    it('renders the active-usage message in plain text', () => {
      const text = budgetWarningText(content({ threshold: '50' }));

      expect(text).toContain('Ayunis Core – Budgetwarnung');
      expect(text).toContain('Hallo Andrea Admin,');
      expect(text).toContain(
        'Ihr Team nutzt Ayunis Core bereits aktiv – mindestens 50 % Ihres Organisationsbudgets für diesen Zeitraum sind aufgebraucht. Ein gutes Zeichen dafür, dass KI in Ihrer Organisation ankommt.',
      );
      expect(text).toContain(
        'In den Budget-Einstellungen sehen Sie jederzeit den aktuellen Verbrauch und wie er sich entwickelt.',
      );
      expect(text).toContain(
        'Sprechen Sie frühzeitig mit Ihrem persönlichen Ansprechpartner unter help@ayunis.com',
      );
      expect(text).toContain(
        'Budget-Einstellungen: https://app.example/admin-settings/usage',
      );
    });

    it('renders valid HTML with settings and help links', () => {
      const result = budgetWarningHtml(content({ threshold: '50' }));

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain(
        'mindestens <strong>50 %</strong> Ihres Organisationsbudgets',
      );
      expect(result.html).toMatch(
        /<a[^>]*href="https:\/\/app\.example\/admin-settings\/usage"[^>]*>Budget-Einstellungen<\/a>/,
      );
      expect(result.html).toContain('mailto:help@ayunis.com');
    });
  });

  describe('org budget at 80%', () => {
    it('warns about the free-model fallback in plain text', () => {
      const text = budgetWarningText(content({ threshold: '80' }));

      expect(text).toContain('Ayunis Core – Budgetwarnung');
      expect(text).toContain(
        'mindestens 80 % Ihres Organisationsbudgets sind aufgebraucht. Damit Ihr Team ohne Einschränkung mit den leistungsstarken Modellen weiterarbeiten kann, lohnt sich jetzt ein Blick auf den Verbrauch in den Budget-Einstellungen.',
      );
      expect(text).toContain(
        'Als Sicherheitsnetz stehen im Chat weiterhin kostenlose Modelle zur Verfügung, sodass die Arbeit nie ganz stillsteht.',
      );
      expect(text).toContain(
        'Ihr persönlicher Ansprechpartner hilft Ihnen gern: help@ayunis.com.',
      );
    });

    it('renders valid HTML', () => {
      const result = budgetWarningHtml(content({ threshold: '80' }));

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain(
        'mindestens <strong>80 %</strong> Ihres Organisationsbudgets',
      );
    });
  });

  describe('org budget at 100%', () => {
    it('announces exhaustion and the free-model fallback in plain text', () => {
      const text = budgetWarningText(content({ threshold: '100' }));

      expect(text).toContain('Ayunis Core – Budget aufgebraucht');
      expect(text).toContain(
        'Ihr Organisationsbudget für diesen Zeitraum ist vollständig aufgebraucht. Ihr Team steht damit aber nicht still: Als Sicherheitsnetz stehen im Chat weiterhin kostenlose Modelle zur Verfügung, sodass Ihr Team ohne Unterbrechung weiterarbeiten kann.',
      );
      expect(text).toContain(
        'Alle Details finden Sie in den Budget-Einstellungen. Damit Ihr Team wieder mit den vollen, leistungsstarken Modellen arbeiten kann, erweitern Sie Ihr Paket.',
      );
      expect(text).toContain(
        'Ihr persönlicher Ansprechpartner findet mit Ihnen schnell die passende Lösung: help@ayunis.com.',
      );
      expect(text).not.toContain('mindestens');
    });

    it('renders valid HTML with the exhausted headline', () => {
      const result = budgetWarningHtml(content({ threshold: '100' }));

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('Budget aufgebraucht');
    });
  });

  describe('user limit at 80%', () => {
    const userContent = content({
      scope: BudgetWarningScope.USER,
      targetName: 'Jane Doe',
      threshold: '80',
    });

    it('names the user and explains the consequence in plain text', () => {
      const text = budgetWarningText(userContent);

      expect(text).toContain('Ayunis Core – Limitwarnung');
      expect(text).toContain(
        'Jane Doe hat mindestens 80 % des individuell festgelegten Limits erreicht. Sobald das Limit vollständig erreicht ist, kann diese Person Ayunis Core nicht mehr nutzen, bis Sie das Limit anpassen.',
      );
      expect(text).toContain(
        'Sie können das Limit für einzelne Nutzer jederzeit in den Einstellungen prüfen und anpassen.',
      );
      expect(text).toContain(
        'Einstellungen: https://app.example/admin-settings/usage',
      );
    });

    it('renders valid HTML with the user name emphasized', () => {
      const result = budgetWarningHtml(userContent);

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('<strong>Jane Doe</strong>');
      expect(result.html).toMatch(
        /<a[^>]*href="https:\/\/app\.example\/admin-settings\/usage"[^>]*>Einstellungen<\/a>/,
      );
    });
  });

  describe('user limit at 100%', () => {
    it('announces the blocked user in plain text', () => {
      const text = budgetWarningText(
        content({
          scope: BudgetWarningScope.USER,
          targetName: 'Jane Doe',
          threshold: '100',
        }),
      );

      expect(text).toContain('Ayunis Core – Limit erreicht');
      expect(text).toContain(
        'Jane Doe hat das individuell festgelegte Limit vollständig erreicht und kann Ayunis Core aktuell nicht mehr nutzen.',
      );
      expect(text).toContain(
        'Passen Sie das Limit in den Einstellungen an, damit diese Person wieder weiterarbeiten kann.',
      );
    });
  });

  describe('team limit at 80%', () => {
    it('names the team and explains the consequence in plain text', () => {
      const text = budgetWarningText(
        content({
          scope: BudgetWarningScope.TEAM,
          targetName: 'Engineering',
          threshold: '80',
        }),
      );

      expect(text).toContain('Ayunis Core – Limitwarnung');
      expect(text).toContain(
        'das Team Engineering hat mindestens 80 % des individuell festgelegten Limits erreicht. Sobald das Limit vollständig erreicht ist, können die Teammitglieder Ayunis Core nicht mehr nutzen, bis Sie das Limit anpassen.',
      );
      expect(text).toContain(
        'Sie können das Limit für einzelne Teams jederzeit in den Einstellungen prüfen und anpassen.',
      );
    });
  });

  describe('team limit at 100%', () => {
    it('announces the blocked team in plain text', () => {
      const text = budgetWarningText(
        content({
          scope: BudgetWarningScope.TEAM,
          targetName: 'Engineering',
          threshold: '100',
        }),
      );

      expect(text).toContain('Ayunis Core – Limit erreicht');
      expect(text).toContain(
        'das Team Engineering hat das individuell festgelegte Limit vollständig erreicht und kann Ayunis Core aktuell nicht mehr nutzen.',
      );
      expect(text).toContain(
        'Passen Sie das Limit in den Einstellungen an, damit das Team wieder weiterarbeiten kann.',
      );
    });
  });

  describe('subjects', () => {
    it('builds the org warning subject with the threshold', () => {
      expect(budgetWarningSubject(content({ threshold: '50' }))).toBe(
        'Budgetwarnung: 50 % Ihres Organisationsbudgets erreicht',
      );
    });

    it('builds the org exhausted subject', () => {
      expect(budgetWarningSubject(content({ threshold: '100' }))).toBe(
        'Ihr Organisationsbudget ist vollständig aufgebraucht',
      );
    });

    it('builds the user warning and blocked subjects', () => {
      const userContent = (threshold: string) =>
        content({
          scope: BudgetWarningScope.USER,
          targetName: 'Jane Doe',
          threshold,
        });

      expect(budgetWarningSubject(userContent('80'))).toBe(
        'Limitwarnung: Jane Doe hat 80 % des Limits erreicht',
      );
      expect(budgetWarningSubject(userContent('100'))).toBe(
        'Limit erreicht: Jane Doe kann Ayunis Core nicht mehr nutzen',
      );
    });

    it('builds the team warning and blocked subjects', () => {
      const teamContent = (threshold: string) =>
        content({
          scope: BudgetWarningScope.TEAM,
          targetName: 'Engineering',
          threshold,
        });

      expect(budgetWarningSubject(teamContent('80'))).toBe(
        'Limitwarnung: Das Team Engineering hat 80 % des Limits erreicht',
      );
      expect(budgetWarningSubject(teamContent('100'))).toBe(
        'Limit erreicht: Das Team Engineering kann Ayunis Core nicht mehr nutzen',
      );
    });
  });

  describe('rendering safety', () => {
    it('escapes HTML in the target name', () => {
      const result = budgetWarningHtml(
        content({
          scope: BudgetWarningScope.USER,
          targetName: '<Jane> & Co',
          threshold: '80',
        }),
      );

      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('&lt;Jane&gt; &amp; Co');
      expect(result.html).not.toContain('<Jane>');
    });

    it('falls back to a neutral greeting without a recipient name', () => {
      const text = budgetWarningText(content({ recipientName: null }));

      expect(text).toContain('Hallo,');
      expect(text).not.toContain('Hallo Andrea');
    });
  });
});
