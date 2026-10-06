import type { Role } from './types';

export interface JourneyStep {
  label: string;
  hint: string;
  role: Role;
  path: string;
}

export const JOURNEY: JourneyStep[] = [
  {
    label: 'So funktioniert es',
    hint: 'Wem eine Fähigkeit gehört, bestimmt, wer sie nutzt. Geteilt wird nicht mehr direkt.',
    role: 'member',
    path: '/skills/so-funktioniert-es',
  },
  {
    label: 'Mitarbeiterin: eigene Fähigkeiten',
    hint: 'Lena sieht nur, was ihr gehört. Ihre Anfrage an Team Bauamt ist noch offen.',
    role: 'member',
    path: '/skills',
  },
  {
    label: 'Mitarbeiterin: Team und Organisation',
    hint: 'Was dem Team oder der Organisation gehört, steht im zweiten Tab. Lena kann es nutzen, aber nicht ändern.',
    role: 'member',
    path: '/skills?tab=shared',
  },
  {
    label: 'Mitarbeiterin: Fähigkeit übergeben',
    hint: 'Lena wählt, ob ihre Fähigkeit an Team Bauamt oder an die Organisation geht. Das Team prüft der Team-Admin, die Organisation ein Admin.',
    role: 'member',
    path: '/skills/protokoll',
  },
  {
    label: 'Team-Admin: Anfragen prüfen',
    hint: 'Jonas ist Team-Admin von Bauamt und Bürgerservice. Er sieht die Anfragen pro Team und gibt sie frei oder lehnt sie ab.',
    role: 'teamAdmin',
    path: '/skills?tab=requests',
  },
  {
    label: 'Team-Admin: Fähigkeit für das Team erstellen',
    hint: 'Unter „Selbst erstellen“ wählt Jonas, ob die Fähigkeit ihm oder Team Bauamt gehört.',
    role: 'teamAdmin',
    path: '/skills',
  },
  {
    label: 'Team-Admin: eigenes Team verwalten',
    hint: 'Über „Organisation“ im Avatar-Menü sieht Jonas dieselbe Teamverwaltung wie Admins, aber nur Bauamt und Bürgerservice. Er sieht, wer noch Team-Admin ist, und pflegt die Mitglieder.',
    role: 'teamAdmin',
    path: '/admin-settings/teams/bauamt',
  },
  {
    label: 'Admin: Fähigkeit für die Organisation erstellen',
    hint: 'Sabine erstellt sie für alle. Sie landet nicht bei ihren eigenen, sondern unter „Organisation“.',
    role: 'orgAdmin',
    path: '/skills',
  },
  {
    label: 'Admin: Fähigkeit für alle verpflichtend',
    hint: 'Sabine macht den „Datenschutz-Check“ für alle verpflichtend. Bei allen anderen steht dann „Immer aktiv“ statt des Schalters.',
    role: 'orgAdmin',
    path: '/skills/datenschutz',
  },
  {
    label: 'Admin: alle Anfragen',
    hint: 'Sabine prüft Anfragen an die Organisation und kann auch Anfragen jedes Teams freigeben. Jonas möchte seine Fähigkeit an die Organisation übergeben.',
    role: 'orgAdmin',
    path: '/skills?tab=requests',
  },
  {
    label: 'Admin: Rollen und Berechtigungen',
    hint: 'Oben die Rechte der Rollen, darunter eine eigene Card für Team-Admins. Nimmt Sabine Team-Admins „Team-Admins ernennen“, kann Jonas die Rolle in seinem Team nur noch sehen.',
    role: 'orgAdmin',
    path: '/admin-settings/roles',
  },
  {
    label: 'Admin: Team-Admins ernennen',
    hint: 'Sabine macht Lena im Bürgerservice zur Team-Admin. Wechselt man danach zu Lena, hat sie den Tab „Anfragen“ für dieses Team.',
    role: 'orgAdmin',
    path: '/admin-settings/teams/buergerservice',
  },
  {
    label: 'Wissen: eigene Sammlung übergeben',
    hint: 'Wissen funktioniert wie Fähigkeiten. Lena übergibt ihre „Notizen Bauleitplanung“ an eines ihrer Teams oder an die Organisation.',
    role: 'member',
    path: '/knowledge-bases/bauleitplanung-notizen',
  },
  {
    label: 'Wissen: Anfragen prüfen',
    hint: 'Tobias möchte „Unterlagen Kassenprüfung“ an Team Kämmerei übergeben. Sabine gibt frei oder lehnt ab.',
    role: 'orgAdmin',
    path: '/knowledge-bases?tab=requests',
  },
  {
    label: 'Arbeitsbereiche',
    hint: 'Tobias sieht, wo er Eigentümer ist und welche Rechte er in den anderen hat. „Gemeinderat Oktober“ hat Sabine für die ganze Organisation freigegeben.',
    role: 'workspaceOwner',
    path: '/workspaces',
  },
  {
    label: 'Eigentümer: Fähigkeiten im Arbeitsbereich',
    hint: 'Im Arbeitsbereich erstellte und verknüpfte Fähigkeiten stehen getrennt. Was verknüpft ist, nutzen alle Mitglieder.',
    role: 'workspaceOwner',
    path: '/workspaces/haushalt-2027?tab=skills',
  },
  {
    label: 'Eigentümer: Fähigkeiten verknüpfen',
    hint: 'Über „Fähigkeit hinzufügen“ verknüpft man Vorhandenes oder erstellt Neues. Im Dialog steht nur, was noch verknüpft werden kann.',
    role: 'workspaceOwner',
    path: '/workspaces/haushalt-2027?tab=skills&dialog=add',
  },
  {
    label: 'Eigentümer: Personen einladen',
    hint: 'Tobias lädt als Eigentümer Personen ein und wählt pro Person: Kann verwenden, Kann bearbeiten oder Vollzugriff. Will eine Verwaltung das nicht, schaltet ein Admin das Teilen für Benutzer in den Rollen ab.',
    role: 'workspaceOwner',
    path: '/workspaces/haushalt-2027?tab=skills&dialog=members',
  },
  {
    label: 'Ganzes Team einladen',
    hint: 'Jonas hat Team Bauamt eingeladen. Alle im Team haben Zugriff, auch wer später dazukommt. Einzelnen Personen gibt er eine andere Stufe oder nimmt sie heraus.',
    role: 'teamAdmin',
    path: '/workspaces/bauleitplanung-nord?tab=skills&dialog=members',
  },
  {
    label: 'Kann bearbeiten: eigene Fähigkeit verknüpfen',
    hint: 'Lena darf den Arbeitsbereich bearbeiten und verknüpft eine eigene Fähigkeit.',
    role: 'member',
    path: '/workspaces/haushalt-2027?tab=skills',
  },
  {
    label: 'Kann verwenden: nur nutzen',
    hint: 'Sabine darf den Arbeitsbereich nur verwenden. Sie nutzt die Fähigkeiten, ändert aber nichts.',
    role: 'orgAdmin',
    path: '/workspaces/haushalt-2027?tab=skills',
  },
  {
    label: 'Eigentümer: Eigentum übertragen',
    hint: 'Nur der Eigentümer kann den Arbeitsbereich löschen oder ihn einer anderen Person übertragen, zum Beispiel bevor er die Verwaltung verlässt. Er behält danach Vollzugriff. Mit Vollzugriff lässt sich der Arbeitsbereich bearbeiten, aber nicht löschen.',
    role: 'workspaceOwner',
    path: '/workspaces/haushalt-2027?tab=skills&dialog=transfer',
  },
];
