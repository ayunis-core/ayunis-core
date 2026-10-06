import type { PrototypeSkill } from './types';

const INSTRUCTIONS: Record<string, string> = {
  'einfache-sprache':
    'Schreibe in kurzen Sätzen mit höchstens 15 Wörtern. Erkläre Fachbegriffe beim ersten Vorkommen. Sprich die Leserin oder den Leser direkt an und nenne am Ende immer eine Ansprechperson mit Telefonnummer.',
  datenschutz:
    'Markiere Namen, Adressen, Geburtsdaten, Aktenzeichen und Kontodaten. Schlage für jede Stelle eine Schwärzung oder Umformulierung vor. Nutze die Wissenssammlung „Datenschutzleitfaden der Verwaltung“.',
  ratsvorlage:
    'Gliedere jede Vorlage in Sachverhalt, Begründung, finanzielle Auswirkungen und Beschlussvorschlag. Halte den Beschlussvorschlag in einem Satz.',
  pressemitteilung:
    'Beginne mit dem Wichtigsten in einem Satz. Ergänze ein Zitat der Bürgermeisterin und einen Absatz mit Hintergrund. Höchstens 2.000 Zeichen.',
  bauantrag:
    'Prüfe die Unterlagen gegen die Checkliste der Bauvorlagenverordnung. Liste fehlende Unterlagen mit Paragraf auf und formuliere eine freundliche Nachforderung. Nutze die Wissenssammlung „Bauvorlagenverordnung“.',
  haushaltsansaetze:
    'Erkläre jeden Ansatz mit Vorjahreswert, Veränderung in Euro und Prozent und dem Grund der Veränderung. Nutze die Wissenssammlung „Haushaltssatzung 2026“.',
  'mail-antworten':
    'Antworte höflich und konkret. Nenne den nächsten Schritt und eine Frist. Unterschreibe mit „Ihr Bauamt der Stadt Musterstadt“.',
  tabellen:
    'Prüfe Summen, Zwischensummen und Vorzeichen. Markiere leere Zellen und Werte, die stark vom Durchschnitt abweichen.',
  haushaltsrede:
    'Baue die Rede in drei Teile: Rückblick, Schwerpunkte 2027, Ausblick. Nutze die Eckdaten aus der Wissenssammlung „Eckwertebeschluss 2027“.',
};

export function instructionsFor(skill: PrototypeSkill): string {
  return (
    INSTRUCTIONS[skill.id] ??
    `Unterstütze bei „${skill.name}“. Gehe Schritt für Schritt vor, frage bei fehlenden Angaben nach und fasse das Ergebnis am Ende in Stichpunkten zusammen.`
  );
}
