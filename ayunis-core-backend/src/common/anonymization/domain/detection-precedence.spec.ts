import { PiiCategory } from './pii-category.enum';
import type { PiiDetection } from './pii-detection';
import { resolveDetectionOverlaps } from './detection-precedence';

const detection = (
  text: string,
  entityType: string,
  category: PiiCategory,
  start: number,
  end: number,
  score = 0.9,
): PiiDetection => ({
  entityType,
  category,
  text: text.substring(start, end),
  start,
  end,
  score,
});

describe('resolveDetectionOverlaps', () => {
  it('keeps the outermost of nested detections of the same category', () => {
    const text = 'Ich bin der Dani';
    const inner = detection(text, 'PERSON', PiiCategory.PERSON_NAME, 12, 16);
    const outer = detection(text, 'PERSON', PiiCategory.PERSON_NAME, 8, 16);

    expect(resolveDetectionOverlaps([inner, outer], text)).toEqual([outer]);
  });

  it('keeps the outermost of nested name-like detections of different categories', () => {
    const text = 'Berlin University is in Germany';
    const city = detection(text, 'LOCATION', PiiCategory.LOCATION, 0, 6);
    const org = detection(
      text,
      'ORGANIZATION',
      PiiCategory.ORGANIZATION,
      0,
      17,
    );

    expect(resolveDetectionOverlaps([city, org], text)).toEqual([org]);
  });

  // A name that swallows the local part of an email: the email has
  // token-exact boundaries and keeps its whole range, the name is trimmed to
  // what lies before it, without the separating space, with its text updated.
  it('trims a name-like detection around a structured one it crosses', () => {
    const text = 'Max Mueller max.mueller@example.org schreibt';
    const name = detection(text, 'PERSON', PiiCategory.PERSON_NAME, 0, 23, 0.7);
    const email = detection(
      text,
      'EMAIL_ADDRESS',
      PiiCategory.EMAIL_ADDRESS,
      12,
      35,
      1,
    );

    expect(resolveDetectionOverlaps([name, email], text)).toEqual([
      { ...name, start: 0, end: 11, text: 'Max Mueller' },
      email,
    ]);
  });

  it('splits a name-like detection around a structured one inside it', () => {
    const text = 'Rathaus Musterstadt info@musterstadt.de Marktplatz 1';
    const place = detection(text, 'LOCATION', PiiCategory.LOCATION, 0, 52, 0.6);
    const email = detection(
      text,
      'EMAIL_ADDRESS',
      PiiCategory.EMAIL_ADDRESS,
      20,
      39,
      1,
    );

    expect(resolveDetectionOverlaps([place, email], text)).toEqual([
      { ...place, start: 0, end: 19, text: 'Rathaus Musterstadt' },
      email,
      { ...place, start: 40, end: 52, text: 'Marktplatz 1' },
    ]);
  });

  it('drops a name-like piece that is only whitespace after carving', () => {
    const text = 'x max@example.org';
    const name = detection(text, 'PERSON', PiiCategory.PERSON_NAME, 1, 17, 0.5);
    const email = detection(
      text,
      'EMAIL_ADDRESS',
      PiiCategory.EMAIL_ADDRESS,
      2,
      17,
      1,
    );

    expect(resolveDetectionOverlaps([name, email], text)).toEqual([email]);
  });

  it('keeps the remainder of a structured detection that crosses another', () => {
    const text = 'mail m.lehmann@example.org/path';
    const email = detection(
      text,
      'EMAIL_ADDRESS',
      PiiCategory.EMAIL_ADDRESS,
      5,
      26,
      1,
    );
    const url = detection(text, 'URL', PiiCategory.URL_OR_IP, 15, 31, 0.5);

    expect(resolveDetectionOverlaps([email, url], text)).toEqual([
      email,
      { ...url, start: 26, end: 31, text: '/path' },
    ]);
  });

  it('keeps the remainder of a name-like detection that crosses another', () => {
    const text = 'Stadt Musterstadt Verwaltung';
    const place = detection(text, 'LOCATION', PiiCategory.LOCATION, 0, 17);
    const org = detection(
      text,
      'ORGANIZATION',
      PiiCategory.ORGANIZATION,
      6,
      28,
    );

    expect(resolveDetectionOverlaps([place, org], text)).toEqual([
      place,
      { ...org, start: 18, end: 28, text: 'Verwaltung' },
    ]);
  });

  // An unmapped engine type lands in OTHER; its precision is unknown, so it
  // yields to structured detections like a name does.
  it('treats OTHER as name-like', () => {
    const text = 'Kunde 4711 kunde@example.org';
    const other = detection(text, 'CUSTOMER_ID', PiiCategory.OTHER, 0, 16, 0.4);
    const email = detection(
      text,
      'EMAIL_ADDRESS',
      PiiCategory.EMAIL_ADDRESS,
      11,
      28,
      1,
    );

    expect(resolveDetectionOverlaps([other, email], text)).toEqual([
      { ...other, start: 0, end: 10, text: 'Kunde 4711' },
      email,
    ]);
  });

  it('returns disjoint detections sorted by start', () => {
    const text = 'Anna, +49 30 1234567, Berlin';
    const place = detection(text, 'LOCATION', PiiCategory.LOCATION, 22, 28);
    const phone = detection(
      text,
      'PHONE_NUMBER',
      PiiCategory.PHONE_NUMBER,
      6,
      20,
      0.4,
    );
    const name = detection(text, 'PERSON', PiiCategory.PERSON_NAME, 0, 4);

    expect(resolveDetectionOverlaps([place, phone, name], text)).toEqual([
      name,
      phone,
      place,
    ]);
  });
});
