import { SpeechLanguageDetectorService } from './speech-language-detector.service';

describe('SpeechLanguageDetectorService', () => {
  const detector = new SpeechLanguageDetectorService();

  it.each([
    [
      'deu',
      'Die Gemeinde hat beschlossen, die Öffnungszeiten des Bürgerbüros ab dem nächsten Monat zu verlängern.',
    ],
    [
      'eng',
      'The council decided to extend the opening hours of the citizen office starting next month.',
    ],
    ['jpn', '市議会は来月から市民窓口の営業時間を延長することを決定しました。'],
    [
      'cmn',
      '市议会决定从下个月开始延长市民办公室的开放时间，以便更好地服务居民。',
    ],
    [
      'fra',
      "Le conseil municipal a décidé de prolonger les horaires d'ouverture du bureau des citoyens.",
    ],
    [
      'spa',
      'El ayuntamiento decidió ampliar el horario de atención de la oficina ciudadana a partir del próximo mes.',
    ],
    [
      'rus',
      'Городской совет решил продлить часы работы приёмной для граждан начиная со следующего месяца.',
    ],
    [
      'arb',
      'قرر المجلس البلدي تمديد ساعات عمل مكتب المواطنين اعتبارا من الشهر المقبل.',
    ],
  ])('detects %s', (expected, text) => {
    expect(detector.detect(text, 'en')).toBe(expected);
  });

  it('maps Nynorsk to the Norwegian voice language', () => {
    expect(
      detector.detect(
        'Kommunestyret har vedteke å utvida opningstidene for innbyggjarkontoret frå neste månad.',
        'de',
      ),
    ).toBe('nob');
  });

  it.each([
    ['de', 'deu'],
    ['en', 'eng'],
  ] as const)(
    'falls back to the %s UI language for very short text',
    (uiLanguage, expected) => {
      expect(detector.detect('Sure, here you go.', uiLanguage)).toBe(expected);
    },
  );

  it('falls back to the UI language for a language without a preset voice', () => {
    expect(
      detector.detect(
        'Kommunfullmäktige beslutade att förlänga öppettiderna för medborgarkontoret från och med nästa månad.',
        'de',
      ),
    ).toBe('deu');
  });

  it('falls back to the UI language when detection is undetermined', () => {
    expect(detector.detect('1234 5678 9012 3456 7890 1234 5678', 'en')).toBe(
      'eng',
    );
  });
});
