import type { UUID } from 'crypto';
import type { OparlFilePage } from './oparl-document';
import type {
  OparlFileSkipReason,
  OparlFileTextStatus,
} from 'src/domain/oparl/domain/oparl-file-text';

export interface OparlRef {
  id: UUID;
  name: string | null;
}

export interface OparlBodyRef {
  id: UUID;
  name: string | null;
}

export interface OparlPaperRef extends OparlRef {
  reference: string | null;
  web: string | null;
}

export interface OparlMeetingRef extends OparlRef {
  start: string | null;
  web: string | null;
}

export interface OparlFileRef extends OparlRef {
  fileName: string | null;
  mimeType: string | null;
  date: string | null;
  accessUrl: string | null;
  web: string | null;
}

export interface OparlConsultationDetail {
  role: string | null;
  authoritative: boolean | null;
  organizations: OparlRef[];
  meeting: OparlMeetingRef | null;
  agendaItem: {
    id: UUID;
    number: string | null;
    name: string | null;
    result: string | null;
    resolutionText: string | null;
    web: string | null;
  } | null;
}

export interface OparlPaperDetail {
  type: 'paper';
  id: UUID;
  body: OparlBodyRef;
  name: string | null;
  reference: string | null;
  paperType: string | null;
  date: string | null;
  web: string | null;
  mainFile: OparlFileRef | null;
  auxiliaryFiles: OparlFileRef[];
  originatorPersons: OparlRef[];
  originatorOrganizations: OparlRef[];
  underDirectionOf: OparlRef[];
  relatedPapers: OparlPaperRef[];
  superordinatedPapers: OparlPaperRef[];
  subordinatedPapers: OparlPaperRef[];
  /** Ordered by the meeting's start: the paper's way through the committees. */
  consultations: OparlConsultationDetail[];
}

export interface OparlAgendaItemDetail {
  id: UUID;
  number: string | null;
  order: number | null;
  name: string | null;
  public: boolean | null;
  result: string | null;
  resolutionText: string | null;
  web: string | null;
  paper: OparlPaperRef | null;
  resolutionFile: OparlFileRef | null;
  auxiliaryFiles: OparlFileRef[];
}

export interface OparlMeetingDetail {
  type: 'meeting';
  id: UUID;
  body: OparlBodyRef;
  name: string | null;
  start: string | null;
  end: string | null;
  meetingState: string | null;
  cancelled: boolean | null;
  web: string | null;
  location: {
    description: string | null;
    streetAddress: string | null;
    room: string | null;
    postalCode: string | null;
    locality: string | null;
  } | null;
  organizations: OparlRef[];
  participants: OparlRef[];
  invitation: OparlFileRef | null;
  resultsProtocol: OparlFileRef | null;
  verbatimProtocol: OparlFileRef | null;
  auxiliaryFiles: OparlFileRef[];
  agendaItems: OparlAgendaItemDetail[];
}

/** A membership as seen from its organization (with `person`) or its person (with `organization`). */
export interface OparlMembershipDetail {
  person?: OparlRef | null;
  organization?: OparlRef | null;
  role: string | null;
  votingRight: boolean | null;
  startDate: string | null;
  endDate: string | null;
  onBehalfOf: OparlRef | null;
}

export interface OparlOrganizationDetail {
  type: 'organization';
  id: UUID;
  body: OparlBodyRef;
  name: string | null;
  shortName: string | null;
  organizationType: string | null;
  classification: string | null;
  startDate: string | null;
  endDate: string | null;
  website: string | null;
  web: string | null;
  subOrganizationOf: OparlRef | null;
  memberships: OparlMembershipDetail[];
}

export interface OparlPersonDetail {
  type: 'person';
  id: UUID;
  body: OparlBodyRef;
  name: string | null;
  formOfAddress: string | null;
  title: string[];
  affix: string | null;
  status: string[];
  web: string | null;
  memberships: OparlMembershipDetail[];
}

export type OparlObjectDetail =
  | OparlPaperDetail
  | OparlMeetingDetail
  | OparlOrganizationDetail
  | OparlPersonDetail;

export interface OparlFileContent {
  file: OparlFileRef & { body: OparlBodyRef; web: string | null };
  /** `null` while the file was not read yet. */
  status: OparlFileTextStatus | null;
  skipReason: OparlFileSkipReason | null;
  pageCount: number | null;
  /** The requested pages, in order. */
  pages: OparlFilePage[];
}

export enum OparlListType {
  MEETINGS = 'meetings',
  ORGANIZATIONS = 'organizations',
  PERSONS = 'persons',
}

export interface OparlListFilters {
  /** Part of the name (organizations: or short name), case-insensitive. */
  name?: string;
  /** Meetings starting on or after / on or before, `YYYY-MM-DD` in Europe/Berlin. */
  from?: string;
  to?: string;
  /** Meetings of the organization, persons with a membership in it. */
  organizationId?: UUID;
}

export interface OparlMeetingListItem {
  id: UUID;
  body: OparlBodyRef;
  name: string | null;
  start: string | null;
  end: string | null;
  cancelled: boolean | null;
  web: string | null;
  organizations: OparlRef[];
}

export interface OparlOrganizationListItem {
  id: UUID;
  body: OparlBodyRef;
  name: string | null;
  shortName: string | null;
  organizationType: string | null;
  classification: string | null;
  startDate: string | null;
  endDate: string | null;
  web: string | null;
}

export interface OparlPersonListItem {
  id: UUID;
  body: OparlBodyRef;
  name: string | null;
  status: string[];
  web: string | null;
}

export type OparlListItem =
  OparlMeetingListItem | OparlOrganizationListItem | OparlPersonListItem;

export interface OparlListPage {
  items: OparlListItem[];
  total: number;
}

/** A stretch of a file's text that fits one tool result. */
export interface OparlFileReading extends Omit<OparlFileContent, 'pages'> {
  pages: Array<OparlFilePage & { truncated?: true }>;
  /** The page to read on with, `null` at the end. */
  nextPage: number | null;
}

export interface OparlListResult extends OparlListPage {
  page: number;
  pageSize: number;
  hasMore: boolean;
}
