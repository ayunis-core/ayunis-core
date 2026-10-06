import type { PrototypeSkill } from './types';

const DETAILS: Record<
  string,
  Pick<PrototypeSkill, 'fromMarketplace' | 'updatedAt'>
> = {
  'einfache-sprache': { fromMarketplace: true, updatedAt: 'vor 3 Wochen' },
  datenschutz: { updatedAt: 'vor 2 Monaten' },
  ratsvorlage: { updatedAt: 'vor 1 Woche' },
  pressemitteilung: { fromMarketplace: true, updatedAt: 'vor 5 Tagen' },
  bauantrag: { updatedAt: 'gestern' },
  bebauungsplan: { updatedAt: 'vor 2 Wochen' },
  haushaltsansaetze: { updatedAt: 'vor 4 Tagen' },
  terminanfragen: { fromMarketplace: true, updatedAt: 'vor 1 Monat' },
  protokoll: { fromMarketplace: true, updatedAt: 'heute' },
  'mail-antworten': { updatedAt: 'vor 3 Tagen' },
  baustelleninfo: { updatedAt: 'heute' },
  tabellen: { updatedAt: 'vor 6 Tagen' },
  foerderantraege: { updatedAt: 'vor 2 Wochen' },
  sitzungstermine: { updatedAt: 'vor 1 Monat' },
};

export function withDetails(skill: PrototypeSkill): PrototypeSkill {
  return { ...skill, ...DETAILS[skill.id] };
}
