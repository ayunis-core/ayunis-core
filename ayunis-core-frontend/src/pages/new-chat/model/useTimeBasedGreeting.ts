import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

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
    {
      de: 'Der frühe Bürger fängt den Sachbearbeiter.',
      en: 'The early citizen catches the clerk.',
    },
    {
      de: 'Die Flure sind noch leer. Beste Zeit für Behördengänge.',
      en: 'The hallways are still empty. Best time for official business.',
    },
    {
      de: 'Morgenstund hat Aktenband im Mund.',
      en: 'The early bird gets the paperwork done.',
    },
    {
      de: 'Selbst der Kopierer schläft noch. Was kann ich tun?',
      en: 'Even the copier is still sleeping. How can I help?',
    },
    {
      de: 'Um diese Zeit? Sie meinen es ernst mit der Verwaltung.',
      en: 'At this hour? You take administration seriously.',
    },
    {
      de: 'Die Jalousien sind noch unten. Der Service ist oben.',
      en: 'The blinds are still down. The service is up.',
    },
    {
      de: 'Bevor die ersten Stempel fallen – was steht an?',
      en: 'Before the first stamps drop – what can I do?',
    },
    {
      de: 'Der Drucker heizt vor. Ich bin schon warm.',
      en: "The printer is warming up. I'm already warm.",
    },
    {
      de: 'Ganz früh dran. Die Formulare warten schon.',
      en: 'Very early. The forms are already waiting.',
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
    {
      de: 'Die Stempeluhr hat geklingelt. Wie kann ich helfen?',
      en: 'The time clock has rung. How can I help?',
    },
    {
      de: 'Guten Morgen. Ihr Anliegen in dreifacher Ausfertigung, bitte.',
      en: 'Good morning. Your request in triplicate, please.',
    },
    {
      de: 'Die Wartemarken sind frisch gedruckt. Sie brauchen keine.',
      en: "The queue tickets are freshly printed. You don't need one.",
    },
    {
      de: 'Zimmer 101 ist besetzt. Zimmer KI ist frei.',
      en: 'Room 101 is occupied. Room AI is available.',
    },
    {
      de: 'Erster Kaffee, erste Anfrage. Passt.',
      en: 'First coffee, first request. Perfect.',
    },
    {
      de: 'Die Unterschriftenmappe liegt bereit. Was soll rein?',
      en: "The signature folder is ready. What's going in?",
    },
    {
      de: 'Frisch gestempelt und bereit für Ihre Fragen.',
      en: 'Freshly stamped and ready for your questions.',
    },
    {
      de: 'Der Postbote war noch nicht da. Ich schon.',
      en: "The mailman hasn't arrived yet. I have.",
    },
    {
      de: 'Morgens um acht macht die Behörde auf. Und ich mit.',
      en: 'The office opens at eight. And so do I.',
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
      en: 'The queue would be long now. Not here.',
    },
    {
      de: 'Mitten im Tagesgeschäft. Schießen Sie los.',
      en: 'In the middle of daily business. Fire away.',
    },
    {
      de: 'Hochbetrieb im Bürgerbüro. Hier herrscht Ruhe.',
      en: "Rush hour at the citizen's office. It's quiet here.",
    },
    {
      de: 'Die Formulare stapeln sich. Ihre Frage passt noch drauf.',
      en: 'The forms are piling up. Your question still fits.',
    },
    {
      de: 'Aktenzeichen XY ungelöst? Nicht mit mir.',
      en: 'Case file XY unsolved? Not with me.',
    },
    {
      de: 'Alle Schalter besetzt. Dieser hier ist immer frei.',
      en: 'All counters occupied. This one is always free.',
    },
    {
      de: 'Volle Auslastung im Amt. Null Wartezeit hier.',
      en: 'Full capacity at the office. Zero wait time here.',
    },
    {
      de: 'Der Kopierer qualmt. Ich nicht.',
      en: "The copier is smoking. I'm not.",
    },
    {
      de: 'Telefone klingeln überall. Hier ist es ruhig.',
      en: "Phones ringing everywhere. It's quiet here.",
    },
    {
      de: 'Peak Performance in der Verwaltung. Fragen Sie los.',
      en: 'Peak performance in administration. Ask away.',
    },
    {
      de: 'Die Stempel sind heiß gelaufen. Meiner nicht.',
      en: "The stamps are overheating. Mine isn't.",
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
      en: 'Lunch break? A foreign concept to me.',
    },
    {
      de: 'Der Schalter wäre jetzt zu. Fragen Sie trotzdem.',
      en: 'The counter would be closed now. Ask anyway.',
    },
    {
      de: 'Currywurst-Pause für die anderen. Service für Sie.',
      en: 'Currywurst break for the others. Service for you.',
    },
    {
      de: 'Die Mikrowelle piept nebenan. Ich bin einsatzbereit.',
      en: "The microwave is beeping next door. I'm ready for action.",
    },
    {
      de: 'Geschlossen wegen Mittag? Nicht dieser Schalter.',
      en: 'Closed for lunch? Not this counter.',
    },
    {
      de: 'Die Kollegen sind beim Mensa-Schnitzel. Ich bin hier.',
      en: "The colleagues are at the cafeteria schnitzel. I'm here.",
    },
    {
      de: 'Mittagstisch nebenan. Servicetisch hier.',
      en: 'Lunch table next door. Service table here.',
    },
    {
      de: 'Die Kaffeekanne ist leer. Mein Wissen nicht.',
      en: 'The coffee pot is empty. My knowledge is not.',
    },
    {
      de: 'Alle beim Essen. Ich bei der Arbeit.',
      en: "Everyone's eating. I'm working.",
    },
    {
      de: 'Brotzeit für die Belegschaft. Beratung für Sie.',
      en: 'Lunch for the staff. Consultation for you.',
    },
    {
      de: 'Der Pausenraum ist voll. Der Chat ist bereit.',
      en: 'The break room is full. The chat is ready.',
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
    {
      de: 'Verdauungsspaziergang? Ich bleibe am Platz.',
      en: "Digestive walk? I'm staying at my desk.",
    },
    {
      de: 'Die Kaffeemaschine läuft auf Hochtouren. Ich auch.',
      en: 'The coffee machine is running at full speed. So am I.',
    },
    {
      de: 'Mittagsloch im Amt. Hier ist alles dicht.',
      en: 'Afternoon slump in the office. Everything is tight here.',
    },
    {
      de: 'Espresso-Zeit für Menschen. Antwort-Zeit für mich.',
      en: 'Espresso time for humans. Answer time for me.',
    },
    {
      de: 'Müde Augen am Bildschirm? Meine sind hellwach.',
      en: 'Tired eyes on the screen? Mine are wide awake.',
    },
    {
      de: 'Die Tastatur klappert langsamer. Meine nicht.',
      en: "The keyboards are clicking slower. Mine isn't.",
    },
    {
      de: 'Siesta-Stimmung im Großraumbüro. Hier herrscht Betrieb.',
      en: "Siesta mood in the open office. It's busy here.",
    },
    {
      de: 'Der Nachmittagskaffee dampft. Ich dampfe vor Tatendrang.',
      en: "The afternoon coffee is steaming. I'm steaming with enthusiasm.",
    },
    {
      de: 'Energietief? Nicht bei mir.',
      en: 'Energy low? Not with me.',
    },
  ],

  // 15–17 Uhr (Nachmittagsschicht / Afternoon Shift)
  lateAfternoon: [
    {
      de: 'Die Sprechstunde neigt sich dem Ende zu – fragen Sie schnell.',
      en: 'Office hours are coming to an end – ask quickly.',
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
    {
      de: 'Gleich ist Schichtwechsel. Ich bleibe.',
      en: "Shift change coming up. I'm staying.",
    },
    {
      de: 'Die Uhr tickt Richtung Feierabend. Meine nicht.',
      en: "The clock is ticking towards closing time. Mine isn't.",
    },
    {
      de: 'Noch schnell vor Büroschluss? Kein Problem.',
      en: 'Quick question before closing? No problem.',
    },
    {
      de: 'Der Parkplatz leert sich. Der Service bleibt.',
      en: 'The parking lot is emptying. The service stays.',
    },
    {
      de: 'Bald ist Feierabend. Noch Zeit für eine Frage?',
      en: 'Closing time soon. Time for one more question?',
    },
    {
      de: 'Die Akten werden zugeklappt. Mein Ohr bleibt offen.',
      en: 'The files are being closed. My ear stays open.',
    },
    {
      de: 'Countdown zum Dienstschluss. Bei mir läuft keine Uhr.',
      en: "Countdown to closing. There's no clock running for me.",
    },
    {
      de: 'Die letzten Unterschriften des Tages. Und Ihre Frage?',
      en: 'The last signatures of the day. And your question?',
    },
    {
      de: 'Kurz vor Torschluss. Aber die Tür steht offen.',
      en: 'Just before closing. But the door is open.',
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
    {
      de: 'Der Pförtner ist weg. Ich empfange Sie trotzdem.',
      en: "The doorman is gone. I'll receive you anyway.",
    },
    {
      de: 'Behördenschluss war um 17 Uhr. Hier nicht.',
      en: 'Office closed at 5 PM. Not here.',
    },
    {
      de: 'Die Aktenschränke sind verschlossen. Mein Wissen nicht.',
      en: 'The filing cabinets are locked. My knowledge is not.',
    },
    {
      de: 'Abendsprechstunde ohne Termin. Was führt Sie her?',
      en: 'Evening consultation without appointment. What brings you here?',
    },
    {
      de: 'Überstunden für Menschen. Normalzeit für mich.',
      en: 'Overtime for humans. Regular time for me.',
    },
    {
      de: 'Das Bürolicht ist aus. Der Bildschirm leuchtet noch.',
      en: 'The office light is off. The screen is still glowing.',
    },
    {
      de: 'Nach 17 Uhr? Kein Problem, ich habe Gleitzeit.',
      en: 'After 5 PM? No problem, I have flexible hours.',
    },
    {
      de: 'Die Reinigungskraft kommt. Der Service geht nicht.',
      en: "The cleaner is coming. The service isn't leaving.",
    },
    {
      de: 'Feierabendbier für andere. Feierabend-Service für Sie.',
      en: 'After-work beer for others. After-work service for you.',
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
    {
      de: 'Der Nachtwächter macht Runde. Ich mache Service.',
      en: 'The night watchman is making rounds. I provide service.',
    },
    {
      de: 'Stille im Amt. Laut in meinem Prozessor.',
      en: 'Silence in the office. Busy in my processor.',
    },
    {
      de: 'Nachtschicht ohne Schichtdienst. Was darf es sein?',
      en: 'Night shift without shift work. What can I do for you?',
    },
    {
      de: 'Auch Nachteulen verdienen Verwaltung.',
      en: 'Even night owls deserve administration.',
    },
    {
      de: 'Schlaflos in der Behörde? Ich auch – freiwillig.',
      en: 'Sleepless at the office? Me too – voluntarily.',
    },
    {
      de: 'Die Sterne leuchten. Mein Service auch.',
      en: 'The stars are shining. So is my service.',
    },
    {
      de: 'Mitternachtsbürokratie. Ganz ohne Papierkram.',
      en: 'Midnight bureaucracy. Without any paperwork.',
    },
    {
      de: 'Wenn die Stadt schläft, wacht der Chatbot.',
      en: 'When the city sleeps, the chatbot watches.',
    },
    {
      de: 'Zu später Stunde noch Fragen? Immer gerne.',
      en: 'Questions at this late hour? Always welcome.',
    },
    {
      de: 'Die Nachtschicht hat begonnen. Was kann ich tun?',
      en: 'The night shift has begun. What can I do?',
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
 * The greeting is returned in the user's current language (German or English).
 *
 * The greeting is memoized and only recalculated when the component mounts
 * (not on every render), so it stays consistent during the session.
 */
export function useTimeBasedGreeting(): string {
  const { i18n } = useTranslation();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const period = getTimePeriod(hour);
    return getRandomGreeting(period);
  }, []);

  // Return greeting in user's language (default to German if not English)
  return i18n.language === 'en' ? greeting.en : greeting.de;
}
