import { registerAs } from '@nestjs/config';

export const releaseNotesConfig = registerAs('releaseNotes', () => ({
  // Without it the backend syncs no release notes from Announcable.
  announcableOrgId: process.env.ANNOUNCABLE_ORG_ID?.trim() || null,
}));

export type ReleaseNotesConfig = ReturnType<typeof releaseNotesConfig>;
