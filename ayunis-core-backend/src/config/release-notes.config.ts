import { registerAs } from '@nestjs/config';

const ANNOUNCABLE_URL = 'https://release-notes.locaboo.de';

export const releaseNotesConfig = registerAs('releaseNotes', () => ({
  // Without it the backend syncs no release notes from Announcable.
  announcableOrgId: process.env.ANNOUNCABLE_ORG_ID?.trim() || null,
  // Only overridden to point the e2e backend at a stand-in for Announcable.
  announcableOrigin: new URL(
    process.env.ANNOUNCABLE_URL?.trim() || ANNOUNCABLE_URL,
  ).origin,
}));

export type ReleaseNotesConfig = ReturnType<typeof releaseNotesConfig>;
