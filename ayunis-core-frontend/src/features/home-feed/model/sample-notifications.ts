import type { NotificationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

const HOUR = 60 * 60 * 1000;

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * HOUR).toISOString();
}

function sample(
  id: string,
  fields: Pick<
    NotificationResponseDto,
    'type' | 'headline' | 'subheadline' | 'body'
  > & { hours: number; isRead?: boolean },
): NotificationResponseDto {
  const createdAt = hoursAgo(fields.hours);
  return {
    id,
    type: fields.type,
    headline: fields.headline,
    subheadline: fields.subheadline,
    body: fields.body,
    media: null,
    routineId: null,
    routineThreadId: null,
    readAt: fields.isRead ? createdAt : null,
    createdAt,
  };
}

export function buildSampleNotifications(): NotificationResponseDto[] {
  return [
    sample('sample-n1', {
      type: 'routine',
      headline: 'Zwei neue Verordnungen zum Gewerberecht',
      subheadline: 'Verkündungsplattform NRW · heute',
      hours: 2,
      body: `Heute wurden zwei Verordnungen veröffentlicht, die Ihren Schwerpunkt Gewerberecht betreffen.

**1. Verordnung zur Änderung der Gewerbeanzeigenverordnung**
Neue Pflichtangaben bei der Anmeldung von Reisegewerben ab dem 1. Januar. Formulare im Bürgerbüro müssen angepasst werden.

**2. Zweite Verordnung über Zuständigkeiten im Gewerberecht**
Die Zuständigkeit für Bewachungsgewerbe wechselt von den Kreisen zu den kreisfreien Städten.

[Zur Veröffentlichung](https://example.org)`,
    }),
    sample('sample-n2', {
      type: 'routine',
      headline: 'Drei Presseartikel erwähnen das Bürgerbüro',
      subheadline: 'Pressespiegel · heute',
      hours: 3,
      body: `Drei regionale Zeitungen berichten über die verlängerten Öffnungszeiten des Bürgerbüros. Der Tenor ist überwiegend positiv, ein Artikel kritisiert die Wartezeiten bei der Terminvergabe.`,
    }),
    sample('sample-n3', {
      type: 'routine_error',
      headline: 'Ausschreibungen konnten nicht geprüft werden',
      subheadline: 'Vergabeportal · heute',
      hours: 5,
      body: `Die Routine konnte das Vergabeportal nicht erreichen. Ayunis Core versucht es morgen um 09:30 Uhr erneut.`,
    }),
    sample('sample-n4', {
      type: 'release_note',
      headline: 'Routinen erledigen jetzt wiederkehrende Aufgaben für Sie',
      subheadline: 'Neu in Ayunis Core',
      hours: 20,
      body: `Mit Routinen prüft Ayunis Core jeden Tag zur gewünschten Uhrzeit Ihre Quellen und legt die Ergebnisse in Ihrem Posteingang ab.`,
    }),
    sample('sample-n5', {
      type: 'routine',
      headline: 'Keine relevanten Änderungen im Amtsblatt',
      subheadline: 'Amtsblatt · gestern',
      hours: 28,
      isRead: true,
      body: `Im gestrigen Amtsblatt gab es keine Veröffentlichungen, die Ihren Arbeitsbereich betreffen.`,
    }),
  ];
}
