import type { PersonSidebar, SidebarChat } from './types';

function chats(prefix: string, titles: string[]): SidebarChat[] {
  return titles.map((title, index) => ({ id: `${prefix}-${index}`, title }));
}

export const PERSON_SIDEBAR: Record<string, PersonSidebar> = {
  lena: {
    favoriteChats: chats('lena-fav', ['Stellungnahme B-Plan Nr. 47']),
    chats: chats('lena', [
      'Antwort an Familie Yilmaz zum Bauantrag',
      'Protokoll Teambesprechung 30.09.',
      'Nachforderung Unterlagen Carport',
      'Baustelleninfo Lindenstraße',
      'Rückfrage Brandschutz Kita Am Park',
      'Gebührenbescheid erklären',
    ]),
  },
  jonas: {
    favoriteChats: chats('jonas-fav', ['Prüfliste Bauanträge überarbeiten']),
    chats: chats('jonas', [
      'Pressetext Sperrung Hauptstraße',
      'Teamziele Bauamt für das 4. Quartal',
      'Stellungnahme Bebauungsplan Nr. 47',
      'Einarbeitung neue Kollegin',
      'Anwohnerinfo Kanalsanierung',
    ]),
  },
  sabine: {
    favoriteChats: chats('sabine-fav', ['Dienstvereinbarung Ayunis Core']),
    chats: chats('sabine', [
      'Einladung Ältestenrat Oktober',
      'Rundschreiben Datenschutz an alle Ämter',
      'Pressemitteilung Ehrenamtspreis',
      'Auswertung Nutzung Ayunis Core',
      'Sitzungskalender 2027',
    ]),
  },
  tobias: {
    favoriteChats: chats('tobias-fav', ['Eckdaten Haushalt 2027']),
    chats: chats('tobias', [
      'Abweichungen Personalkosten prüfen',
      'Förderantrag Radwegenetz',
      'Erläuterung Ansatz Gebäudeunterhaltung',
      'Mittelfristige Finanzplanung',
      'Rückfrage Finanzausschuss',
    ]),
  },
};
