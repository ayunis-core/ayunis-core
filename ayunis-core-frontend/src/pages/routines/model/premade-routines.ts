import {
  DEFAULT_MODEL_OPTION,
  type RoutineFormFields,
} from '@/features/routines';

/**
 * The fixed premade routines the create menu offers. Their prompts are German
 * because the platforms they check are German; the bracketed parts are for
 * the user to fill in.
 */
export const VERKUENDUNGSPLATTFORM_ROUTINE: RoutineFormFields = {
  name: 'Verkündungsplattform',
  dailyTime: '07:00',
  internetEnabled: true,
  modelId: DEFAULT_MODEL_OPTION,
  prompt: `Prüfe die Verkündungsplattform bzw. das elektronische Gesetz- und Verordnungsblatt meines Bundeslandes auf heute veröffentlichte Gesetze und Verordnungen und bewerte ihre Relevanz für meine Arbeit.

Mein Bundesland: [Bundesland eintragen, z. B. Nordrhein-Westfalen]
Meine Rolle und mein Arbeitsschwerpunkt: [eintragen, z. B. Sachbearbeitung im Ordnungsamt einer Kommune, Schwerpunkt Gewerberecht]

So gehst du vor:
1. Stelle fest, welches Datum heute ist.
2. Finde per Websuche die offizielle Verkündungsplattform oder das elektronische Gesetz- und Verordnungsblatt dieses Bundeslandes. Nutze nur die amtliche Quelle des Landes, keine Nachrichtenseiten oder Drittanbieter.
3. Öffne die Plattform und sieh dir ausschließlich die Veröffentlichungen mit dem heutigen Datum an. Ältere Veröffentlichungen ignorierst du.
4. Bewerte jede heutige Veröffentlichung danach, ob sie für meine Rolle und meinen Arbeitsschwerpunkt relevant ist.
5. Ist mindestens eine Veröffentlichung relevant, sende mir mit send_notification eine Benachrichtigung: eine kurze Überschrift, in der Unterzeile Quelle und Datum, und im Text eine Zusammenfassung, was neu ist und warum es für mich relevant ist, mit Links zu den Originaldokumenten. Fasse mehrere relevante Veröffentlichungen in einer Benachrichtigung zusammen.
6. Gibt es heute keine Veröffentlichungen oder ist keine relevant, sende keine Benachrichtigung. Das ist ebenfalls ein gültiges Ergebnis.
7. Beende die Routine anschließend mit finish_routine.`,
};
