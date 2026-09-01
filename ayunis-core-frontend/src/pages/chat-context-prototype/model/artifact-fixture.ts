import {
  ArtifactResponseDtoType,
  ArtifactVersionResponseDtoAuthorType,
  type ArtifactResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

const CONTENT = `<h2>Neues Bürgerbüro öffnet am 15. September</h2>
<p>Die Stadtverwaltung eröffnet am 15. September das neue Bürgerbüro in der Marktstraße 12. Bürgerinnen und Bürger erreichen dort künftig alle Dienstleistungen der Einwohnermeldung, des Passwesens und der Kfz-Zulassung an einem Ort.</p>
<p>Die Öffnungszeiten sind montags bis freitags von 8 bis 16 Uhr, donnerstags bis 18 Uhr. Termine lassen sich weiterhin online vereinbaren; für kurze Anliegen steht eine offene Sprechstunde zur Verfügung.</p>
<h3>Barrierefreier Zugang</h3>
<p>Das Gebäude ist stufenlos zugänglich, ein Aufzug verbindet beide Etagen. Ein Leitsystem in einfacher Sprache führt zu den Schaltern.</p>
<p><em>Rückfragen: Pressestelle der Stadtverwaltung, Telefon 0000 000-000</em></p>`;

export const ARTIFACT_FIXTURE: ArtifactResponseDto = {
  id: 'artifact-pressemitteilung',
  type: ArtifactResponseDtoType.document,
  threadId: 'prototype-thread',
  userId: 'prototype-user',
  title: 'Pressemitteilung Bürgerbüro',
  currentVersionNumber: 1,
  versions: [
    {
      id: 'version-1',
      artifactId: 'artifact-pressemitteilung',
      versionNumber: 1,
      content: CONTENT,
      authorType: ArtifactVersionResponseDtoAuthorType.ASSISTANT,
      createdAt: '2026-09-01T08:00:00.000Z',
    },
  ],
  createdAt: '2026-09-01T08:00:00.000Z',
  updatedAt: '2026-09-01T08:00:00.000Z',
};
