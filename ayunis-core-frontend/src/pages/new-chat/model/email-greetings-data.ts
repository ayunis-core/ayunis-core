import type { GreetingSet } from './greetings-data';

// The Outlook pane's counterpart to `greetings`: same periods and tone, but
// every line is about the email the pane is open on.
export const emailGreetings: GreetingSet = {
  // 6–8 Uhr
  earlyMorning: [
    {
      de: 'Der Posteingang schläft noch. Diese E-Mail nicht.',
      en: "The inbox is still asleep. This email isn't.",
    },
    {
      de: 'Vor dem ersten Kaffee schon im Postfach? Respekt.',
      en: 'In the inbox before the first coffee? Respect.',
    },
    {
      de: 'Noch keine Abwesenheitsnotiz in Sicht. Legen wir los.',
      en: "No out-of-office in sight yet. Let's get going.",
    },
    {
      de: 'Noch vor der ersten Rundmail im Dienst. Vorbildlich.',
      en: 'On duty before the first all-staff email. Exemplary.',
    },
    {
      de: 'Das Postfach gähnt noch. Was steht in dieser Mail?',
      en: "The inbox is still yawning. What's in this email?",
    },
    {
      de: 'So früh haben die ungelesenen Mails keine Chance.',
      en: "This early, the unread emails don't stand a chance.",
    },
  ],
  // 8–10 Uhr
  morningStart: [
    {
      de: 'Posteingang geöffnet. Bitte ziehen Sie keine Nummer.',
      en: 'Inbox open. No need to take a number.',
    },
    {
      de: 'Erster Kaffee, erste Antwort. Passt.',
      en: 'First coffee, first reply. Perfect.',
    },
    {
      de: 'Guten Morgen. Ihre Antwort in einfacher Ausfertigung genügt.',
      en: 'Good morning. A single copy of your reply will do.',
    },
    {
      de: 'Die Post ist da. Diesmal ohne Briefträger.',
      en: 'The mail is here. No mail carrier needed.',
    },
    {
      de: 'Dienstbeginn. Der Posteingang hat jetzt Sprechstunde.',
      en: 'Office hours begin. The inbox is now taking visitors.',
    },
    {
      de: 'Die Stempeluhr hat geklingelt. Der Posteingang auch.',
      en: 'The time clock has rung. So has the inbox.',
    },
  ],
  // 10–12 Uhr
  lateMorning: [
    {
      de: 'AW: AW: WG: AW: – Zeit, den Faden zu entwirren?',
      en: 'RE: RE: FW: RE: – time to untangle the thread?',
    },
    {
      de: '„Wie bereits erwähnt …“ – das geht auch freundlicher.',
      en: "“As mentioned in my last email …” – let's put it more kindly.",
    },
    {
      de: 'Der Posteingang wächst. Ich helfe beim Abbauen.',
      en: "The inbox keeps growing. I'll help bring it down.",
    },
    {
      de: 'CC an alle, Antwort von keinem? Fangen wir an.',
      en: "CC'd to everyone, answered by no one? Let's start.",
    },
    {
      de: 'Betreff: Dringend. Inhalt: mal sehen.',
      en: "Subject: Urgent. Content: let's see.",
    },
    {
      de: 'Zwischen zwei Besprechungen noch schnell diese Mail?',
      en: 'This email, quickly, between two meetings?',
    },
  ],
  // 12–13 Uhr
  lunchBreak: [
    {
      de: 'Abwesenheitsnotiz: Mittag. Ich bin trotzdem da.',
      en: "Out of office: lunch. I'm still here.",
    },
    {
      de: 'Die Kantine ruft. Eine kurze Antwort geht noch.',
      en: 'The cafeteria is calling. A quick reply still fits in.',
    },
    {
      de: 'Mahlzeit! Die E-Mail kann warten. Muss sie aber nicht.',
      en: "Enjoy your lunch! The email can wait. It doesn't have to.",
    },
    {
      de: 'Zwischen Suppe und Nachtisch: eine kurze Antwort?',
      en: 'Between soup and dessert: a quick reply?',
    },
    {
      de: 'Lesebestätigung angefordert. Mittagessen auch.',
      en: 'Read receipt requested. So is lunch.',
    },
  ],
  // 13–15 Uhr
  earlyAfternoon: [
    {
      de: 'Suppenkoma? Ich lese die E-Mail für Sie.',
      en: "Food coma? I'll read the email for you.",
    },
    {
      de: '„Bitte beachten Sie den Anhang.“ – Mache ich gern.',
      en: '“Please see attached.” – Happy to do that for you.',
    },
    {
      de: 'Lange Mail, wenig Zeit? Ich fasse zusammen.',
      en: "Long email, little time? I'll summarize.",
    },
    {
      de: 'Wurde diese Mail schon gelesen? Jetzt ja.',
      en: 'Has this email been read? It has now.',
    },
    {
      de: 'Drei Absätze, eine Frage. Ich finde sie.',
      en: "Three paragraphs, one question. I'll find it.",
    },
    {
      de: 'Nachmittagstief im Posteingang? Ich bin hellwach.',
      en: "Afternoon slump in the inbox? I'm wide awake.",
    },
  ],
  // 15–17 Uhr
  lateAfternoon: [
    {
      de: 'Die Wiedervorlage ruft. Was sagt diese E-Mail?',
      en: 'The follow-up file is calling. What does this email say?',
    },
    {
      de: 'Allen antworten oder nur dem Absender? Eine Frage für 16 Uhr.',
      en: 'Reply all or just the sender? A question for 4 pm.',
    },
    {
      de: 'Posteingang null ist ein Mythos. Diese Mail schaffen wir.',
      en: 'Inbox zero is a myth. This email we can handle.',
    },
    {
      de: '„Ich melde mich morgen“ – oder wir erledigen es jetzt.',
      en: "“I'll get back to you tomorrow” – or we finish it now.",
    },
    {
      de: 'Feierabend in Sicht. Der Posteingang sieht das anders.',
      en: 'Closing time in sight. The inbox disagrees.',
    },
    {
      de: 'Um vier schreibt niemand gern lange Mails. Ich schon.',
      en: "Nobody likes writing long emails at four. I don't mind.",
    },
  ],
  // 17–21 Uhr
  evening: [
    {
      de: 'Abends noch im Postfach? Dann machen wir es kurz.',
      en: "Still in your inbox tonight? Let's keep it short.",
    },
    {
      de: 'Die Abwesenheitsnotiz steht? Die Antwort noch nicht.',
      en: "Out-of-office already set? This reply isn't yet.",
    },
    {
      de: 'Die Kollegen sind weg, die Mails sind geblieben.',
      en: 'Your colleagues have left. The emails stayed.',
    },
    {
      de: 'Ein letzter Blick ins Postfach? Ich schaue mit.',
      en: "One last look at the inbox? I'll look with you.",
    },
    {
      de: 'Heute antworten oder morgen „Sorry für die späte Antwort“?',
      en: 'Reply tonight, or start tomorrow with “Sorry for the late reply”?',
    },
  ],
  // 21–6 Uhr
  night: [
    {
      de: 'Post um diese Uhrzeit? Ich frage nicht nach Lesebestätigung.',
      en: "An email at this hour? I won't ask for a read receipt.",
    },
    {
      de: 'Mitternachtspost: Jetzt entwerfen, morgen senden.',
      en: 'Midnight mail: draft now, send tomorrow.',
    },
    {
      de: 'Der Server schläft nie. Ich auch nicht.',
      en: 'Servers never sleep. Neither do I.',
    },
    {
      de: 'Nachtschicht im Posteingang. Leise, bitte.',
      en: 'Night shift in the inbox. Quietly, please.',
    },
    {
      de: 'Um diese Zeit antwortet nur die Abwesenheitsnotiz. Und ich.',
      en: 'At this hour only the out-of-office replies. And me.',
    },
    {
      de: 'Mails nach Mitternacht? Ich entwerfe, Sie schlafen drüber.',
      en: 'Emails after midnight? I draft, you sleep on it.',
    },
  ],
};
