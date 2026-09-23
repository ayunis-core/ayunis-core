import { CreateInviteDtoRole } from '@/shared/api';

export type CsvErrorCode =
  | 'EMPTY_FILE'
  | 'INVALID_HEADERS'
  | 'INVALID_ROW_FORMAT'
  | 'INVALID_EMAIL'
  | 'INVALID_ROLE'
  | 'DUPLICATE_EMAIL';

export interface CsvError {
  code: CsvErrorCode;
  row?: number;
  /** For DUPLICATE_EMAIL: the row where the email first appeared */
  firstOccurrenceRow?: number;
  /** For INVALID_HEADERS: the detected separator */
  separator?: string;
}

export interface ParsedInvite {
  email: string;
  role: CreateInviteDtoRole;
  teamNames: string[];
  rowNumber: number;
  isValid: boolean;
  error?: CsvError;
  serverError?: string;
}

export interface CsvParseResult {
  success: boolean;
  data: ParsedInvite[];
  errors: CsvError[];
}

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const VALID_ROLES: string[] = Object.values(CreateInviteDtoRole);

/**
 * Detects the CSV separator used in the content.
 * Checks for ';' first, then falls back to ','.
 */
function detectSeparator(headerLine: string): ',' | ';' {
  // Check for semicolon first
  if (headerLine.includes(';')) {
    return ';';
  }
  // Fall back to comma
  return ',';
}

function validateRow(
  email: string,
  role: string,
  rowNumber: number,
  seenEmails: Map<string, number>,
): CsvError | undefined {
  if (!EMAIL_REGEX.test(email)) {
    return { code: 'INVALID_EMAIL', row: rowNumber };
  }

  if (!VALID_ROLES.includes(role)) {
    return { code: 'INVALID_ROLE', row: rowNumber };
  }

  const existingRow = seenEmails.get(email);
  if (existingRow !== undefined) {
    return {
      code: 'DUPLICATE_EMAIL',
      row: rowNumber,
      firstOccurrenceRow: existingRow,
    };
  }

  seenEmails.set(email, rowNumber);
  return undefined;
}

export function parseInviteCsv(csvContent: string): CsvParseResult {
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return {
      success: false,
      data: [],
      errors: [{ code: 'EMPTY_FILE' }],
    };
  }

  // Detect separator from header line
  const headerLine = lines[0].toLowerCase();
  const separator = detectSeparator(headerLine);

  // Parse header
  const headers = headerLine.split(separator).map((h) => h.trim());

  // Validate headers
  const requiredHeaders = ['email', 'role'];
  const headersMatch =
    (headers.length === requiredHeaders.length || headers.length === 3) &&
    headers
      .slice(0, requiredHeaders.length)
      .every((header, index) => header === requiredHeaders[index]) &&
    (headers.length === 2 || headers[2] === 'teams');

  if (!headersMatch) {
    return {
      success: false,
      data: [],
      errors: [{ code: 'INVALID_HEADERS', row: 1, separator }],
    };
  }

  const result: ParsedInvite[] = [];
  const errors: CsvError[] = [];
  const seenEmails = new Map<string, number>(); // email -> first row number

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const rowNumber = i + 1; // 1-indexed for user display

    // Simple CSV parsing (handles basic cases)
    const values = parseCsvLine(line, separator);

    if (values.length !== headers.length) {
      const error: CsvError = { code: 'INVALID_ROW_FORMAT', row: rowNumber };
      result.push({
        email: values[0] || '',
        role: 'user',
        teamNames: [],
        rowNumber,
        isValid: false,
        error,
      });
      errors.push(error);
      continue;
    }

    const [email, roleValue, teamsValue = ''] = values;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = roleValue.trim().toLowerCase();

    const error = validateRow(
      normalizedEmail,
      normalizedRole,
      rowNumber,
      seenEmails,
    );
    const isValid = error === undefined;

    if (error) {
      errors.push(error);
    }

    result.push({
      email: email.trim(),
      role: normalizedRole as CreateInviteDtoRole,
      teamNames: parseTeamNames(teamsValue),
      rowNumber,
      isValid,
      error,
    });
  }

  return {
    success: errors.length === 0,
    data: result,
    errors,
  };
}

function parseTeamNames(value: string): string[] {
  const names: string[] = [];
  let current = '';
  let escaping = false;

  for (const char of value) {
    if (escaping) {
      current += char === '|' || char === '\\' ? char : `\\${char}`;
      escaping = false;
    } else if (char === '\\') {
      escaping = true;
    } else if (char === '|') {
      names.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  names.push(`${current}${escaping ? '\\' : ''}`.trim());

  return [...new Set(names.filter(Boolean))];
}

/**
 * Simple CSV line parser that handles quoted values
 */
function parseCsvLine(line: string, separator: ',' | ';'): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export function generateInviteTemplate(): string {
  return 'email,role,teams\nuser@example.com,user,Research|Operations\nmanager@example.com,manager,Research\nadmin@example.com,admin,';
}

export function generateUrlsCsv(
  results: Array<{ email: string; url: string }>,
): string {
  const header = 'email,invite_url';
  const rows = results.map((r) => `${r.email},${r.url}`);
  return [header, ...rows].join('\n');
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
