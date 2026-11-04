import type { TransferTarget } from './types';

export const INITIAL_SHARES: Partial<Record<string, TransferTarget[]>> = {
  'skill:mail-antworten': [{ kind: 'team', teamId: 'bauamt' }],
  'skill:abnahmeprotokoll': [{ kind: 'team', teamId: 'bauamt' }],
  'skill:meldebescheinigung': [{ kind: 'team', teamId: 'buergerservice' }],
  'skill:baustelleninfo': [{ kind: 'org' }],
  'skill:tabellen': [{ kind: 'team', teamId: 'kaemmerei' }],
  'knowledge:bauleitplanung-notizen': [{ kind: 'team', teamId: 'bauamt' }],
  'knowledge:kassenpruefung': [{ kind: 'team', teamId: 'kaemmerei' }],
};
