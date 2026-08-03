import type { MockChartParams, MockEmailParams } from './mock';

export const CHART_CONTENTS: Record<string, MockChartParams> = {
  g5: {
    chartTitle: 'Bürgeranfragen nach Themengebiet',
    xAxis: ['Abfall', 'Meldewesen', 'Bauamt', 'Kfz', 'Gewerbe', 'Soziales'],
    yAxis: [
      { label: 'Mai', values: [142, 98, 64, 87, 41, 33] },
      { label: 'Juni', values: [186, 104, 71, 79, 38, 36] },
    ],
    insight:
      'Im Juni gingen 12 % mehr Anfragen ein als im Mai. Der Anstieg entsteht fast vollständig im Bereich Abfall, ausgelöst durch die neuen Sperrmüll-Termine.',
  },
};

export const EMAIL_CONTENTS: Record<string, MockEmailParams> = {
  g6: {
    to: 'm.berger@example.de',
    subject: 'Ihre Anfrage zum Sperrmüll-Termin',
    body: `Sehr geehrte Frau Berger,

vielen Dank für Ihre Anfrage vom 24. Juni 2026.

Der nächste Sperrmüll-Termin in Ihrem Abholbezirk (Nordstadt, Bezirk 3) ist Donnerstag, der 16. Juli 2026. Bitte stellen Sie den Sperrmüll bis 6:00 Uhr am Morgen der Abholung an den Straßenrand.

Nicht mitgenommen werden Bauschutt, Altreifen und Elektrogeräte. Elektrogeräte können Sie kostenfrei am Wertstoffhof in der Industriestraße 12 abgeben.

Für Rückfragen erreichen Sie uns montags bis freitags von 8:00 bis 12:00 Uhr unter 0123 456-789.

Mit freundlichen Grüßen

Amt für Abfallwirtschaft
Stadtverwaltung Musterstadt`,
  },
};
