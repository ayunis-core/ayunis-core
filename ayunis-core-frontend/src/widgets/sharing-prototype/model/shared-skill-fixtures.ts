import type { PrototypeSkill } from './types';

type Owner = PrototypeSkill['owner'];

const ORG: Owner = { kind: 'org' };

function team(teamId: string): Owner {
  return { kind: 'team', teamId };
}

function skill(
  id: string,
  name: string,
  shortDescription: string,
  owner: Owner,
): PrototypeSkill {
  return { id, name, shortDescription, owner };
}

export const SHARED_SKILLS: PrototypeSkill[] = [
  skill(
    'vermerk',
    'Vermerk schreiben',
    'Formuliert Aktenvermerke mit Sachverhalt, Bewertung und nächstem Schritt.',
    ORG,
  ),
  skill(
    'geschlechtergerecht',
    'Texte geschlechtergerecht formulieren',
    'Passt Texte an den Leitfaden der Verwaltung für geschlechtergerechte Sprache an.',
    ORG,
  ),
  skill(
    'beschwerden',
    'Beschwerden beantworten',
    'Antwortet sachlich auf Beschwerden und nennt den nächsten Schritt.',
    ORG,
  ),
  skill(
    'ausschreibung-pruefen',
    'Ausschreibung prüfen',
    'Prüft Vergabeunterlagen auf Vollständigkeit und typische Formfehler.',
    ORG,
  ),
  skill(
    'englisch',
    'Schreiben auf Englisch',
    'Übersetzt Schreiben ins Englische und verweist auf die verbindliche deutsche Fassung.',
    ORG,
  ),
  skill(
    'zusammenfassung',
    'Lange Dokumente zusammenfassen',
    'Fasst Gutachten, Satzungen und Berichte auf einer Seite zusammen.',
    ORG,
  ),
  skill(
    'stellenausschreibung',
    'Stellenausschreibungen formulieren',
    'Erstellt Stellenausschreibungen nach TVöD mit Aufgaben, Profil und Entgeltgruppe.',
    team('hauptamt'),
  ),
  skill(
    'dienstanweisung-entwurf',
    'Dienstanweisungen entwerfen',
    'Entwirft Dienstanweisungen mit Geltungsbereich, Regelung und Inkrafttreten.',
    team('hauptamt'),
  ),
  skill(
    'sitzungsladung',
    'Einladungen zu Gremiensitzungen',
    'Schreibt Einladungen mit Tagesordnung, Unterlagen und Fristen.',
    team('hauptamt'),
  ),
  skill(
    'stellungnahmen-toeb',
    'Stellungnahmen der Fachbehörden auswerten',
    'Fasst Stellungnahmen der Träger öffentlicher Belange zusammen und ordnet sie.',
    team('bauamt'),
  ),
  skill(
    'bauvoranfrage',
    'Bauvoranfragen beantworten',
    'Beantwortet Bauvoranfragen mit Hinweis auf Bebauungsplan und nächste Schritte.',
    team('bauamt'),
  ),
  skill(
    'denkmalschutz',
    'Denkmalschutz prüfen',
    'Prüft Vorhaben auf denkmalrechtliche Genehmigungspflichten.',
    team('bauamt'),
  ),
  skill(
    'mahnung',
    'Mahnungen formulieren',
    'Schreibt Zahlungserinnerungen und Mahnungen in freundlichem, klarem Ton.',
    team('kaemmerei'),
  ),
  skill(
    'gebuehrenbescheid',
    'Gebührenbescheide erklären',
    'Erklärt Gebührenbescheide verständlich, Posten für Posten.',
    team('kaemmerei'),
  ),
  skill(
    'investitionen',
    'Investitionen priorisieren',
    'Vergleicht Investitionsvorhaben nach Kosten, Nutzen und Förderfähigkeit.',
    team('kaemmerei'),
  ),
  skill(
    'personalausweis',
    'Fragen zum Personalausweis beantworten',
    'Erklärt Beantragung, Gebühren und Abholung des Personalausweises.',
    team('buergerservice'),
  ),
  skill(
    'ummeldung',
    'Ummeldung erklären',
    'Erklärt Schritt für Schritt, wie man sich um- oder abmeldet.',
    team('buergerservice'),
  ),
  skill(
    'fundsachen',
    'Fundsachen bearbeiten',
    'Beantwortet Anfragen zu verlorenen und gefundenen Gegenständen.',
    team('buergerservice'),
  ),
];
