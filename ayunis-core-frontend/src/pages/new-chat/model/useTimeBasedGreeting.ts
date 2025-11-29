import { useMemo } from 'react';

interface Greeting {
  de: string;
  en: string;
}

// Time-based greetings with German bureaucratic humor
// Each time period has a set of greetings to randomly choose from

const greetings: Record<string, Greeting[]> = {
  // 6–8 Uhr (Die Frühaufsteher / Early Birds)
  earlyMorning: [
    {
      de: 'Noch vor dem ersten Bürger am Schalter – Respekt!',
      en: 'Before the first citizen at the counter – respect!',
    },
    {
      de: 'Die Akten sind noch kalt. Was brennt bei Ihnen?',
      en: "The files are still cold. What's burning for you?",
    },
    {
      de: 'Frühdienst. Der Kaffee zieht noch.',
      en: "Early shift. The coffee's still brewing.",
    },
    {
      de: 'Vor Dienstbeginn schon produktiv? Vorbildlich.',
      en: 'Productive before office hours? Exemplary.',
    },
    {
      de: 'Das Faxgerät wärmt sich gerade auf.',
      en: 'The fax machine is just warming up.',
    },
  ],

  // 8–10 Uhr (Klassischer Dienstbeginn / Classic Office Start)
  morningStart: [
    {
      de: 'Die Behörde ist geöffnet. Bitte ziehen Sie eine Nummer... oder fragen Sie einfach.',
      en: 'The office is open. Please take a number... or just ask.',
    },
    {
      de: 'Pünktlich wie ein Beamter. Was liegt an?',
      en: "Punctual as a civil servant. What's on the agenda?",
    },
    {
      de: 'Der Amtsschimmel ist gesattelt.',
      en: 'The bureaucratic horse is saddled.',
    },
    {
      de: 'Dienstbeginn. Ihr Anliegen, bitte.',
      en: 'Office hours begin. Your request, please.',
    },
    {
      de: 'Die Posteingänge sind sortiert – jetzt Sie.',
      en: "The inboxes are sorted – now it's your turn.",
    },
  ],

  // 10–12 Uhr (Hochbetrieb / Peak Hours)
  lateMorning: [
    {
      de: 'Kernarbeitszeit. Alle Sachbearbeiter im Einsatz.',
      en: 'Core working hours. All clerks on duty.',
    },
    {
      de: 'Stoßzeit am Schalter – gut, dass Sie digital hier sind.',
      en: "Rush hour at the counter – good thing you're here digitally.",
    },
    {
      de: 'Zwischen Bauantrag und Bürgeranfrage: Was kann ich tun?',
      en: 'Between building permits and citizen inquiries: How can I help?',
    },
    {
      de: 'Die Warteschlange wäre jetzt lang. Hier nicht.',
      en: "The queue would be long now. Not here.",
    },
    {
      de: 'Mitten im Tagesgeschäft. Schießen Sie los.',
      en: 'In the middle of daily business. Fire away.',
    },
  ],

  // 12–13 Uhr (Mittagspause / Lunch Break)
  lunchBreak: [
    {
      de: 'Das Amt ist in der Mittagspause. Ich nicht.',
      en: "The office is on lunch break. I'm not.",
    },
    {
      de: 'Zwischen 12 und 13 Uhr geschlossen – außer hier.',
      en: 'Closed between 12 and 1 – except here.',
    },
    {
      de: 'Die Kantine ist voll. Der Chat ist leer. Perfektes Timing.',
      en: 'The cafeteria is full. The chat is empty. Perfect timing.',
    },
    {
      de: 'Mittagspause? Für mich ein Fremdwort.',
      en: "Lunch break? A foreign concept to me.",
    },
    {
      de: 'Der Schalter wäre jetzt zu. Fragen Sie trotzdem.',
      en: 'The counter would be closed now. Ask anyway.',
    },
  ],

  // 13–15 Uhr (Suppenkoma / Food Coma)
  earlyAfternoon: [
    {
      de: 'Das Schnitzel wirkt. Ich bin trotzdem wach.',
      en: "The schnitzel is kicking in. I'm still awake though.",
    },
    {
      de: 'Nachmittagstief in der Amtsstube – gut, dass ich keins habe.',
      en: "Afternoon slump in the office – good thing I don't have one.",
    },
    {
      de: 'Die Kollegen verdauen. Ich arbeite.',
      en: "The colleagues are digesting. I'm working.",
    },
    {
      de: 'Schwere Augenlider am Schreibtisch? Hier nicht.',
      en: 'Heavy eyelids at the desk? Not here.',
    },
    {
      de: 'Post-Kantine-Produktivität. Wie kann ich helfen?',
      en: 'Post-cafeteria productivity. How can I help?',
    },
  ],

  // 15–17 Uhr (Nachmittagsschicht / Afternoon Shift)
  lateAfternoon: [
    {
      de: 'Die Sprechstunde neigt sich dem Ende zu – fragen Sie schnell.',
      en: "Office hours are coming to an end – ask quickly.",
    },
    {
      de: 'Noch im Dienst. Was kann ich klären?',
      en: 'Still on duty. What can I clarify?',
    },
    {
      de: 'Letzte Runde vor Feierabend. Was brauchen Sie?',
      en: 'Last round before closing time. What do you need?',
    },
    {
      de: 'Die Ausgangskörbe füllen sich. Und Ihr Anliegen?',
      en: 'The outboxes are filling up. And your request?',
    },
    {
      de: 'Endspurt. Welcher Vorgang soll noch raus?',
      en: 'Final sprint. Which case should still go out?',
    },
  ],

  // 17–21 Uhr (Nach Dienstschluss / After Hours)
  evening: [
    {
      de: 'Das Rathaus ist zu. Ich nicht.',
      en: "City hall is closed. I'm not.",
    },
    {
      de: 'Feierabend für Menschen, Bereitschaft für mich.',
      en: 'Closing time for humans, standby for me.',
    },
    {
      de: 'Öffnungszeiten? Kenne ich nicht.',
      en: "Opening hours? I don't know them.",
    },
    {
      de: 'Die Lichter im Amt sind aus – hier brennt noch eins.',
      en: "The lights in the office are off – one's still on here.",
    },
    {
      de: 'Außerhalb der Geschäftszeiten, aber voll funktionsfähig.',
      en: 'Outside business hours, but fully operational.',
    },
  ],

  // 21–6 Uhr (Nachtschicht / Night Shift)
  night: [
    {
      de: 'Nachtbereitschaft. Was führt Sie her?',
      en: 'Night duty. What brings you here?',
    },
    {
      de: 'Während das Amt schläft: Wie kann ich helfen?',
      en: 'While the office sleeps: How can I help?',
    },
    {
      de: '24-Stunden-Verwaltung. Ohne Wartemarke.',
      en: '24-hour administration. No waiting ticket needed.',
    },
    {
      de: 'Die Akten ruhen. Ich nicht.',
      en: "The files are resting. I'm not.",
    },
    {
      de: 'Nächtlicher Behördengang – ganz ohne kalte Flure.',
      en: 'Nightly visit to the authorities – without the cold hallways.',
    },
  ],
};

function getTimePeriod(hour: number): keyof typeof greetings {
  if (hour >= 6 && hour < 8) return 'earlyMorning';
  if (hour >= 8 && hour < 10) return 'morningStart';
  if (hour >= 10 && hour < 12) return 'lateMorning';
  if (hour >= 12 && hour < 13) return 'lunchBreak';
  if (hour >= 13 && hour < 15) return 'earlyAfternoon';
  if (hour >= 15 && hour < 17) return 'lateAfternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  // 21-6 is night (including 0-5)
  return 'night';
}

function getRandomGreeting(period: keyof typeof greetings): Greeting {
  const periodGreetings = greetings[period];
  const randomIndex = Math.floor(Math.random() * periodGreetings.length);
  return periodGreetings[randomIndex];
}

/**
 * Returns a time-based greeting with German bureaucratic humor.
 * The greeting changes based on the current time of day and is randomly
 * selected from a list of greetings for that time period.
 *
 * The greeting is memoized and only recalculated when the component mounts
 * (not on every render), so it stays consistent during the session.
 */
export function useTimeBasedGreeting(): Greeting {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const period = getTimePeriod(hour);
    return getRandomGreeting(period);
  }, []);

  return greeting;
}
