import { BudgetWarningScope } from '../../../domain/value-objects/budget-warning-scope.enum';

const HELP_EMAIL = 'help@ayunis.com';
const HELP_LINK = `<a href="mailto:${HELP_EMAIL}">${HELP_EMAIL}</a>`;

// Name variants: `text` is the raw (normalized) name for the plain-text
// email, `html` is the already-escaped variant for the MJML body.
export interface BudgetWarningName {
  text: string;
  html: string;
}

export interface BudgetWarningParagraph {
  text: string;
  html: string;
}

export interface BudgetWarningMessage {
  subject: string;
  headline: string;
  preheader: string;
  ctaLabel: string;
  settingsLinkLabel: string;
  paragraphs: BudgetWarningParagraph[];
}

export interface BudgetWarningMessageParams {
  scope: BudgetWarningScope;
  threshold: number;
  targetName: BudgetWarningName;
  settingsUrl: string;
}

function settingsLink(settingsUrl: string, label: string): string {
  return `<a href="${settingsUrl}">${label}</a>`;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported budget warning scope: ${String(value)}`);
}

export function buildBudgetWarningMessage(
  params: BudgetWarningMessageParams,
): BudgetWarningMessage {
  switch (params.scope) {
    case BudgetWarningScope.ORG:
      return orgMessage(params.threshold, params.settingsUrl);
    case BudgetWarningScope.USER:
      return userMessage(
        params.threshold,
        params.targetName,
        params.settingsUrl,
      );
    case BudgetWarningScope.TEAM:
      return teamMessage(
        params.threshold,
        params.targetName,
        params.settingsUrl,
      );
    default:
      return assertNever(params.scope);
  }
}

function orgMessage(
  threshold: number,
  settingsUrl: string,
): BudgetWarningMessage {
  if (threshold >= 100) {
    return orgExhaustedMessage(settingsUrl);
  }
  if (threshold >= 80) {
    return orgWarning80Message(threshold, settingsUrl);
  }
  return orgWarning50Message(threshold, settingsUrl);
}

function orgWarning50Message(
  threshold: number,
  settingsUrl: string,
): BudgetWarningMessage {
  return {
    subject: `Budgetwarnung: ${threshold} % Ihres Organisationsbudgets erreicht`,
    headline: 'Budgetwarnung',
    preheader: `Mindestens ${threshold} % Ihres Organisationsbudgets sind aufgebraucht.`,
    ctaLabel: 'Budget-Einstellungen öffnen',
    settingsLinkLabel: 'Budget-Einstellungen',
    paragraphs: [
      {
        text: `Ihr Team nutzt Ayunis Core bereits aktiv – mindestens ${threshold} % Ihres Organisationsbudgets für diesen Zeitraum sind aufgebraucht. Ein gutes Zeichen dafür, dass KI in Ihrer Organisation ankommt.`,
        html: `Ihr Team nutzt Ayunis Core bereits aktiv – mindestens <strong>${threshold} %</strong> Ihres Organisationsbudgets für diesen Zeitraum sind aufgebraucht. Ein gutes Zeichen dafür, dass KI in Ihrer Organisation ankommt.`,
      },
      {
        text: 'In den Budget-Einstellungen sehen Sie jederzeit den aktuellen Verbrauch und wie er sich entwickelt.',
        html: `In den ${settingsLink(settingsUrl, 'Budget-Einstellungen')} sehen Sie jederzeit den aktuellen Verbrauch und wie er sich entwickelt.`,
      },
      {
        text: `Zeichnet sich ab, dass das Budget vor Ende des Zeitraums aufgebraucht sein wird? Sprechen Sie frühzeitig mit Ihrem persönlichen Ansprechpartner unter ${HELP_EMAIL} – gemeinsam finden wir das passende Paket für Ihren Bedarf.`,
        html: `Zeichnet sich ab, dass das Budget vor Ende des Zeitraums aufgebraucht sein wird? Sprechen Sie frühzeitig mit Ihrem persönlichen Ansprechpartner unter ${HELP_LINK} – gemeinsam finden wir das passende Paket für Ihren Bedarf.`,
      },
    ],
  };
}

function orgWarning80Message(
  threshold: number,
  settingsUrl: string,
): BudgetWarningMessage {
  return {
    subject: `Budgetwarnung: ${threshold} % Ihres Organisationsbudgets erreicht`,
    headline: 'Budgetwarnung',
    preheader: `Mindestens ${threshold} % Ihres Organisationsbudgets sind aufgebraucht.`,
    ctaLabel: 'Budget-Einstellungen öffnen',
    settingsLinkLabel: 'Budget-Einstellungen',
    paragraphs: [
      {
        text: `mindestens ${threshold} % Ihres Organisationsbudgets sind aufgebraucht. Damit Ihr Team ohne Einschränkung mit den leistungsstarken Modellen weiterarbeiten kann, lohnt sich jetzt ein Blick auf den Verbrauch in den Budget-Einstellungen.`,
        html: `mindestens <strong>${threshold} %</strong> Ihres Organisationsbudgets sind aufgebraucht. Damit Ihr Team ohne Einschränkung mit den leistungsstarken Modellen weiterarbeiten kann, lohnt sich jetzt ein Blick auf den Verbrauch in den ${settingsLink(settingsUrl, 'Budget-Einstellungen')}.`,
      },
      {
        text: `Sollte das Budget vollständig aufgebraucht sein, lassen wir Ihr Team nicht im Stich: Als Sicherheitsnetz stehen im Chat weiterhin kostenlose Modelle zur Verfügung, sodass die Arbeit nie ganz stillsteht. Diese sind allerdings deutlich weniger leistungsfähig und für anspruchsvolle Aufgaben nur eingeschränkt geeignet. Damit Ihr Team durchgängig auf voller Leistung bleibt, erweitern Sie Ihr Paket am besten rechtzeitig. Ihr persönlicher Ansprechpartner hilft Ihnen gern: ${HELP_EMAIL}.`,
        html: `Sollte das Budget vollständig aufgebraucht sein, lassen wir Ihr Team nicht im Stich: Als Sicherheitsnetz stehen im Chat weiterhin kostenlose Modelle zur Verfügung, sodass die Arbeit nie ganz stillsteht. Diese sind allerdings deutlich weniger leistungsfähig und für anspruchsvolle Aufgaben nur eingeschränkt geeignet. Damit Ihr Team durchgängig auf voller Leistung bleibt, erweitern Sie Ihr Paket am besten rechtzeitig. Ihr persönlicher Ansprechpartner hilft Ihnen gern: ${HELP_LINK}.`,
      },
    ],
  };
}

function orgExhaustedMessage(settingsUrl: string): BudgetWarningMessage {
  return {
    subject: 'Ihr Organisationsbudget ist vollständig aufgebraucht',
    headline: 'Budget aufgebraucht',
    preheader: 'Ihr Organisationsbudget ist vollständig aufgebraucht.',
    ctaLabel: 'Budget-Einstellungen öffnen',
    settingsLinkLabel: 'Budget-Einstellungen',
    paragraphs: [
      {
        text: 'Ihr Organisationsbudget für diesen Zeitraum ist vollständig aufgebraucht. Ihr Team steht damit aber nicht still: Als Sicherheitsnetz stehen im Chat weiterhin kostenlose Modelle zur Verfügung, sodass Ihr Team ohne Unterbrechung weiterarbeiten kann. Diese sind jedoch deutlich weniger leistungsfähig als gewohnt und für anspruchsvolle Aufgaben nur eingeschränkt geeignet.',
        html: 'Ihr <strong>Organisationsbudget</strong> für diesen Zeitraum ist vollständig aufgebraucht. Ihr Team steht damit aber nicht still: Als Sicherheitsnetz stehen im Chat weiterhin kostenlose Modelle zur Verfügung, sodass Ihr Team ohne Unterbrechung weiterarbeiten kann. Diese sind jedoch deutlich weniger leistungsfähig als gewohnt und für anspruchsvolle Aufgaben nur eingeschränkt geeignet.',
      },
      {
        text: `Alle Details finden Sie in den Budget-Einstellungen. Damit Ihr Team wieder mit den vollen, leistungsstarken Modellen arbeiten kann, erweitern Sie Ihr Paket. Ihr persönlicher Ansprechpartner findet mit Ihnen schnell die passende Lösung: ${HELP_EMAIL}.`,
        html: `Alle Details finden Sie in den ${settingsLink(settingsUrl, 'Budget-Einstellungen')}. Damit Ihr Team wieder mit den vollen, leistungsstarken Modellen arbeiten kann, erweitern Sie Ihr Paket. Ihr persönlicher Ansprechpartner findet mit Ihnen schnell die passende Lösung: ${HELP_LINK}.`,
      },
    ],
  };
}

function userMessage(
  threshold: number,
  name: BudgetWarningName,
  settingsUrl: string,
): BudgetWarningMessage {
  if (threshold >= 100) {
    return {
      subject: `Limit erreicht: ${name.text} kann Ayunis Core nicht mehr nutzen`,
      headline: 'Limit erreicht',
      preheader: `${name.text} hat das festgelegte Limit vollständig erreicht.`,
      ctaLabel: 'Einstellungen öffnen',
      settingsLinkLabel: 'Einstellungen',
      paragraphs: [
        {
          text: `${name.text} hat das individuell festgelegte Limit vollständig erreicht und kann Ayunis Core aktuell nicht mehr nutzen.`,
          html: `<strong>${name.html}</strong> hat das individuell festgelegte Limit vollständig erreicht und kann Ayunis Core aktuell nicht mehr nutzen.`,
        },
        {
          text: 'Passen Sie das Limit in den Einstellungen an, damit diese Person wieder weiterarbeiten kann.',
          html: `Passen Sie das Limit in den ${settingsLink(settingsUrl, 'Einstellungen')} an, damit diese Person wieder weiterarbeiten kann.`,
        },
      ],
    };
  }
  return {
    subject: `Limitwarnung: ${name.text} hat ${threshold} % des Limits erreicht`,
    headline: 'Limitwarnung',
    preheader: `${name.text} hat mindestens ${threshold} % des festgelegten Limits erreicht.`,
    ctaLabel: 'Einstellungen öffnen',
    settingsLinkLabel: 'Einstellungen',
    paragraphs: [
      {
        text: `${name.text} hat mindestens ${threshold} % des individuell festgelegten Limits erreicht. Sobald das Limit vollständig erreicht ist, kann diese Person Ayunis Core nicht mehr nutzen, bis Sie das Limit anpassen.`,
        html: `<strong>${name.html}</strong> hat mindestens <strong>${threshold} %</strong> des individuell festgelegten Limits erreicht. Sobald das Limit vollständig erreicht ist, kann diese Person Ayunis Core nicht mehr nutzen, bis Sie das Limit anpassen.`,
      },
      {
        text: 'Sie können das Limit für einzelne Nutzer jederzeit in den Einstellungen prüfen und anpassen.',
        html: `Sie können das Limit für einzelne Nutzer jederzeit in den ${settingsLink(settingsUrl, 'Einstellungen')} prüfen und anpassen.`,
      },
    ],
  };
}

function teamMessage(
  threshold: number,
  name: BudgetWarningName,
  settingsUrl: string,
): BudgetWarningMessage {
  if (threshold >= 100) {
    return {
      subject: `Limit erreicht: Das Team ${name.text} kann Ayunis Core nicht mehr nutzen`,
      headline: 'Limit erreicht',
      preheader: `Das Team ${name.text} hat das festgelegte Limit vollständig erreicht.`,
      ctaLabel: 'Einstellungen öffnen',
      settingsLinkLabel: 'Einstellungen',
      paragraphs: [
        {
          text: `das Team ${name.text} hat das individuell festgelegte Limit vollständig erreicht und kann Ayunis Core aktuell nicht mehr nutzen.`,
          html: `das Team <strong>${name.html}</strong> hat das individuell festgelegte Limit vollständig erreicht und kann Ayunis Core aktuell nicht mehr nutzen.`,
        },
        {
          text: 'Passen Sie das Limit in den Einstellungen an, damit das Team wieder weiterarbeiten kann.',
          html: `Passen Sie das Limit in den ${settingsLink(settingsUrl, 'Einstellungen')} an, damit das Team wieder weiterarbeiten kann.`,
        },
      ],
    };
  }
  return {
    subject: `Limitwarnung: Das Team ${name.text} hat ${threshold} % des Limits erreicht`,
    headline: 'Limitwarnung',
    preheader: `Das Team ${name.text} hat mindestens ${threshold} % des festgelegten Limits erreicht.`,
    ctaLabel: 'Einstellungen öffnen',
    settingsLinkLabel: 'Einstellungen',
    paragraphs: [
      {
        text: `das Team ${name.text} hat mindestens ${threshold} % des individuell festgelegten Limits erreicht. Sobald das Limit vollständig erreicht ist, können die Teammitglieder Ayunis Core nicht mehr nutzen, bis Sie das Limit anpassen.`,
        html: `das Team <strong>${name.html}</strong> hat mindestens <strong>${threshold} %</strong> des individuell festgelegten Limits erreicht. Sobald das Limit vollständig erreicht ist, können die Teammitglieder Ayunis Core nicht mehr nutzen, bis Sie das Limit anpassen.`,
      },
      {
        text: 'Sie können das Limit für einzelne Teams jederzeit in den Einstellungen prüfen und anpassen.',
        html: `Sie können das Limit für einzelne Teams jederzeit in den ${settingsLink(settingsUrl, 'Einstellungen')} prüfen und anpassen.`,
      },
    ],
  };
}
