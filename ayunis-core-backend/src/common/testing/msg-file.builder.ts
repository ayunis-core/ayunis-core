import { burn, type Entry } from '@kenjiuno/msgreader/lib/Burner';
import { TypeEnum } from '@kenjiuno/msgreader/lib/Reader';

export interface MsgRecipient {
  name: string;
  smtpAddress: string;
  type: 'to' | 'cc';
}

export interface MsgFileFields {
  // Outlook writes IPM.Note for every email; null omits it.
  messageClass?: string | null;
  subject?: string;
  // Subject as raw 8-bit bytes (PT_STRING8), as non-Unicode Outlook stores it.
  ansiSubject?: Buffer;
  internetCodepage?: number;
  senderName?: string;
  senderSmtpAddress?: string;
  submitTime?: Date;
  body?: string;
  bodyHtml?: string;
  binaryHtml?: Buffer;
  recipients?: MsgRecipient[];
  attachmentNames?: string[];
}

const PT_LONG = 0x0003;
const PT_SYSTIME = 0x0040;
const RECIPIENT_TYPE = { to: 1, cc: 2 } as const;
const MS_BETWEEN_1601_AND_1970 = 11644473600000;

// Burner reads a stream's whole underlying ArrayBuffer, ignoring a Buffer's
// byteOffset, so every stream is handed over as an exact-size copy.
function stringStream(
  id: number,
  data: Buffer,
  type: '001F' | '001E' | '0102',
): Entry {
  const tag = id.toString(16).padStart(4, '0').toUpperCase();
  return {
    name: `__substg1.0_${tag}${type}`,
    type: TypeEnum.DOCUMENT,
    length: data.length,
    binaryProvider: () => new Uint8Array(data),
  };
}

function unicodeStream(id: number, value: string): Entry {
  return stringStream(id, Buffer.from(value, 'utf16le'), '001F');
}

/**
 * [MS-OXMSG] 2.4 property stream: a header (32 bytes for the message, 8 for a
 * recipient or attachment) followed by 16-byte fixed-length property entries.
 */
function propertiesStream(
  headerSize: number,
  properties: { id: number; type: number; value: Buffer }[],
): Entry {
  const data = Buffer.alloc(headerSize + properties.length * 16);
  properties.forEach(({ id, type, value }, index) => {
    const offset = headerSize + index * 16;
    data.writeUInt32LE(((id << 16) | type) >>> 0, offset);
    data.writeUInt32LE(0x6, offset + 4);
    value.copy(data, offset + 8);
  });
  return {
    name: '__properties_version1.0',
    type: TypeEnum.DOCUMENT,
    length: data.length,
    binaryProvider: () => new Uint8Array(data),
  };
}

function fileTime(date: Date): Buffer {
  const value = Buffer.alloc(8);
  value.writeBigUInt64LE(
    BigInt(date.getTime() + MS_BETWEEN_1601_AND_1970) * 10000n,
  );
  return value;
}

function long(value: number): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32LE(value);
  return buffer;
}

function rootStreams(fields: MsgFileFields): Entry[] {
  const streams: [number, string | null | undefined][] = [
    [
      0x001a,
      fields.messageClass === undefined ? 'IPM.Note' : fields.messageClass,
    ],
    [0x0037, fields.subject],
    [0x0c1a, fields.senderName],
    [0x5d01, fields.senderSmtpAddress],
    [0x1000, fields.body],
    [0x1013, fields.bodyHtml],
  ];
  const entries = streams
    .filter(
      (stream): stream is [number, string] => typeof stream[1] === 'string',
    )
    .map(([id, value]) => unicodeStream(id, value));
  if (fields.ansiSubject) {
    entries.push(stringStream(0x0037, fields.ansiSubject, '001E'));
  }
  if (fields.binaryHtml) {
    entries.push(stringStream(0x1013, fields.binaryHtml, '0102'));
  }
  const properties = [
    ...(fields.submitTime
      ? [{ id: 0x0039, type: PT_SYSTIME, value: fileTime(fields.submitTime) }]
      : []),
    ...(fields.internetCodepage
      ? [{ id: 0x3fde, type: PT_LONG, value: long(fields.internetCodepage) }]
      : []),
  ];
  return [...entries, propertiesStream(32, properties)];
}

function storage(name: string, children: Entry[]): Entry[] {
  return [
    { name, type: TypeEnum.DIRECTORY, length: 0, children: [] },
    ...children,
  ];
}

function index(entry: number): string {
  return entry.toString(16).padStart(8, '0').toUpperCase();
}

/**
 * Builds a minimal Outlook .msg (CFBF) file in memory with the writer that
 * ships with the parser, so specs need no binary fixtures.
 */
export function buildMsgFile(fields: MsgFileFields): Buffer {
  const groups: Entry[][] = [
    ...rootStreams(fields).map((entry) => [entry]),
    ...(fields.recipients ?? []).map((recipient, i) =>
      storage(`__recip_version1.0_#${index(i)}`, [
        unicodeStream(0x3001, recipient.name),
        unicodeStream(0x39fe, recipient.smtpAddress),
        propertiesStream(8, [
          {
            id: 0x0c15,
            type: PT_LONG,
            value: long(RECIPIENT_TYPE[recipient.type]),
          },
        ]),
      ]),
    ),
    ...(fields.attachmentNames ?? []).map((name, i) =>
      storage(`__attach_version1.0_#${index(i)}`, [
        unicodeStream(0x3707, name),
      ]),
    ),
  ];

  const root: Entry = {
    name: 'Root Entry',
    type: TypeEnum.ROOT,
    length: 0,
    children: [],
  };
  const entries: Entry[] = [root];
  for (const group of groups) {
    const [head, ...children] = group;
    root.children?.push(entries.length);
    entries.push(head);
    for (const child of children) {
      head.children?.push(entries.length);
      entries.push(child);
    }
  }
  return Buffer.from(burn(entries));
}
