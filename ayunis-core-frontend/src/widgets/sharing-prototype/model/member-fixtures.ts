import type { Person } from './types';

const FIRST_NAMES = [
  'Anna',
  'Ben',
  'Carla',
  'David',
  'Elif',
  'Felix',
  'Greta',
  'Hannes',
  'Ida',
  'Jan',
  'Katrin',
  'Lukas',
  'Mia',
  'Niklas',
  'Olga',
  'Paul',
  'Rosa',
  'Simon',
  'Tanja',
  'Uwe',
];

const LAST_NAMES = [
  'Albrecht',
  'Bauer',
  'Conrad',
  'Dietrich',
  'Engel',
  'Fischer',
  'Graf',
  'Hahn',
  'Jäger',
  'Krüger',
  'Lange',
  'Möller',
  'Neumann',
  'Otto',
  'Peters',
  'Roth',
  'Schulte',
  'Thiel',
  'Vogel',
  'Winkler',
];

const EXTRA_COUNTS: Record<string, number> = {
  hauptamt: 6,
  bauamt: 11,
  kaemmerei: 7,
  buergerservice: 30,
};

function emailOf(first: string, last: string): string {
  return `${first}.${last}@musterstadt.de`
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue');
}

function extrasFor(teamId: string, count: number, offset: number): Person[] {
  return Array.from({ length: count }, (_, index) => {
    const n = offset + index;
    const first = FIRST_NAMES[n % FIRST_NAMES.length];
    const last =
      LAST_NAMES[
        (n * 7 + Math.floor(n / FIRST_NAMES.length) * 3) % LAST_NAMES.length
      ];
    return {
      id: `${teamId}-${index + 1}`,
      name: `${first} ${last}`,
      department: '',
      email: emailOf(first, last),
      teamIds: [teamId],
    };
  });
}

let offset = 0;
export const EXTRA_PEOPLE: Person[] = Object.entries(EXTRA_COUNTS).flatMap(
  ([teamId, count]) => {
    const people = extrasFor(teamId, count, offset);
    offset += count;
    return people;
  },
);

export function joinedDate(personId: string, teamId: string): string {
  const seed = [...`${personId}${teamId}`].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  const date = new Date(2024, 0, 15);
  date.setDate(date.getDate() + ((seed * 37) % 600));
  return date.toLocaleDateString('de-DE');
}
