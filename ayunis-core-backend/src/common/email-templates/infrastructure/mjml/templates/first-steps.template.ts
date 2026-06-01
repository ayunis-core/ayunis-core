import mjml2html from 'mjml';
import type { FirstStepsTemplateContent } from '../../../domain/email-template.entity';
import {
  cta,
  ctaGhost,
  divider,
  escapeText,
  h1,
  p,
  promptBubble,
  renderLayout,
  sectionHeading,
  teamSignoff,
  useCaseRow,
} from './_layout';

export function firstStepsText(template: FirstStepsTemplateContent): string {
  return `Schön, dass Sie da sind, ${template.firstName}!

Ihre Einrichtung ist abgeschlossen – Sie können direkt loslegen. Probieren Sie Ayunis Core doch gleich im Chat aus. Zum Beispiel so:

„Hallo Ayunis Core! Wobei kannst du mir in meinem Arbeitsalltag in der Verwaltung helfen? Bitte mit konkreten Beispielen."

Sie erhalten sofort eine Antwort, die zu Ihnen passt – basierend auf dem, was Sie bereits über sich angegeben haben.

Jetzt im Chat ausprobieren: ${template.chatUrl}

ANWENDUNGSBEISPIELE FÜR IHREN ALLTAG

– Texte verfassen: Bekanntmachungen, Pressemitteilungen, Anschreiben oder interne Mitteilungen schnell und passend formulieren.
– Dokumente analysieren: Ziehen Sie Sitzungsvorlagen, Berichte oder Gutachten einfach in den Chat und stellen Sie gezielte Fragen dazu.
– Bürgeranfragen beantworten: Antworten in Ihrem Tonfall formulieren lassen – Sie passen an, kürzen oder versenden direkt.

FÄHIGKEITEN ENTDECKEN

In den Fähigkeiten finden Sie spezialisierte Experten – z. B. einen Daten-Analysten oder einen Dokumenten-Zusammenfasser. Einmal hinzugefügt, stehen sie automatisch im Chat zur Verfügung – ohne weitere Einrichtung.

Sie können eigene Fähigkeiten erstellen oder fertige aus dem Marketplace übernehmen – jederzeit erweiterbar, mit einem Klick einsatzbereit.

Marketplace entdecken: ${template.marketplaceUrl}

EIGENE WISSENSSAMMLUNG NUTZEN

Laden Sie z. B. Gebührenordnungen, Richtlinien, Protokolle oder andere Dokumente hoch. Ayunis Core greift dann gezielt auf Ihre Inhalte zu – statt auf allgemeines Wissen – und zeigt Ihnen passende Quellen direkt an.

So arbeitet Ihre KI immer im Kontext Ihrer Organisation.

Wissen einrichten: ${template.knowledgeUrl}

Wenn Sie Fragen haben oder Unterstützung brauchen, melden Sie sich jederzeit gern.

Viele Grüße
Ihr Ayunis-Team

Diese E-Mail wurde an ${template.userEmail} gesendet.
© ${template.currentYear} Ayunis / Locaboo GmbH.
`;
}

export function firstStepsHtml(template: FirstStepsTemplateContent) {
  return mjml2html(
    renderLayout({
      title: 'Was Sie mit Ayunis Core machen können',
      preheader:
        'Drei Wege, wie Sie Ayunis Core ab heute in Ihrem Verwaltungsalltag nutzen können.',
      logoUrl: template.logoUrl,
      bodyMjml: firstStepsBody(template),
      footerEmail: template.userEmail,
      currentYear: template.currentYear,
    }),
  );
}

function firstStepsBody(template: FirstStepsTemplateContent): string {
  return [
    introSection(template),
    useCasesSection(template),
    skillsSection(template),
    knowledgeSection(template),
    supportSection(template),
  ].join('\n');
}

function introSection(template: FirstStepsTemplateContent): string {
  return [
    `<mj-image src="${template.heroBannerUrl}" alt="Willkommen bei Ayunis Core" width="496px" border-radius="10px" padding="0 0 24px 0" />`,
    h1(`Schön, dass Sie da sind, ${escapeText(template.firstName)}!`),
    p(
      'Ihre Einrichtung ist abgeschlossen – Sie können direkt loslegen. Probieren Sie Ayunis Core doch gleich im Chat aus. Zum Beispiel so:',
    ),
    promptBubble(
      '„Hallo Ayunis Core! Wobei kannst du mir in meinem Arbeitsalltag in der Verwaltung helfen? Bitte mit konkreten Beispielen."',
    ),
    `<mj-spacer height="16px" />`,
    p(
      'Sie erhalten sofort eine Antwort, die zu Ihnen passt – basierend auf dem, was Sie bereits über sich angegeben haben.',
    ),
    cta('Jetzt im Chat ausprobieren', template.chatUrl),
    divider(),
  ].join('\n');
}

function useCasesSection(template: FirstStepsTemplateContent): string {
  return [
    sectionHeading('BEISPIELE', 'Anwendungsbeispiele für Ihren Alltag'),
    useCaseRow(
      template.iconPencilUrl,
      'Texte verfassen',
      'Bekanntmachungen, Pressemitteilungen, Anschreiben oder interne Mitteilungen schnell und passend formulieren.',
    ),
    useCaseRow(
      template.iconFileTextUrl,
      'Dokumente analysieren',
      'Ziehen Sie Sitzungsvorlagen, Berichte oder Gutachten einfach in den Chat und stellen Sie gezielte Fragen dazu.',
    ),
    useCaseRow(
      template.iconMessageCircleUrl,
      'Bürgeranfragen beantworten',
      'Antworten in Ihrem Tonfall formulieren lassen – Sie passen an, kürzen oder versenden direkt.',
    ),
    divider(),
  ].join('\n');
}

function skillsSection(template: FirstStepsTemplateContent): string {
  return [
    sectionHeading('ERWEITERN', 'Fähigkeiten entdecken'),
    p(
      'In den <strong>Fähigkeiten</strong> finden Sie spezialisierte „Experten" – z. B. einen Daten-Analysten oder einen Dokumenten-Zusammenfasser. Einmal hinzugefügt, stehen sie automatisch im Chat zur Verfügung – ohne weitere Einrichtung.',
    ),
    `<mj-image src="${template.skillsBannerUrl}" alt="Fähigkeiten in Ayunis Core – z.B. Daten-Analyst und Dokumenten-Zusammenfasser" width="496px" border-radius="10px" padding="8px 0 16px 0" />`,
    p(
      'Sie können eigene Fähigkeiten erstellen oder fertige aus dem <strong>Marketplace</strong> übernehmen – jederzeit erweiterbar, mit einem Klick einsatzbereit.',
    ),
    ctaGhost('Marketplace entdecken', template.marketplaceUrl),
    divider(),
  ].join('\n');
}

function knowledgeSection(template: FirstStepsTemplateContent): string {
  return [
    sectionHeading('WISSEN NUTZEN', 'Eigene Wissenssammlung nutzen'),
    p(
      'Laden Sie z. B. Gebührenordnungen, Richtlinien, Protokolle oder andere Dokumente hoch. Ayunis Core greift dann gezielt auf Ihre Inhalte zu – statt auf allgemeines Wissen – und zeigt Ihnen passende Quellen direkt an.',
    ),
    `<mj-image src="${template.knowledgeBannerUrl}" alt="Wissenssammlungen in Ayunis Core" width="496px" border-radius="10px" padding="8px 0 16px 0" />`,
    p('So arbeitet Ihre KI immer im Kontext Ihrer Organisation.'),
    ctaGhost('Wissen einrichten', template.knowledgeUrl),
    divider(),
  ].join('\n');
}

function supportSection(template: FirstStepsTemplateContent): string {
  return [
    p(
      'Wenn Sie Fragen haben oder Unterstützung brauchen, melden Sie sich jederzeit gern.',
    ),
    teamSignoff(template.teamUrl),
  ].join('\n');
}
