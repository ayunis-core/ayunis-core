import { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';

export type OparlFieldKind =
  'text' | 'date' | 'datetime' | 'boolean' | 'integer' | 'textArray';

export interface OparlFieldSpec {
  /** Column and OParl property. */
  field: string;
  kind: OparlFieldKind;
}

/** A reference to one object: a URL or the embedded object. */
export interface OparlRefSpec {
  /** Columns `<ref>OparlId` and `<ref>Id`. */
  ref: string;
  source: string;
  target: OparlEntityType;
}

/** References to many objects, kept in a join table. */
export interface OparlJoinSpec {
  relation: string;
  source: string;
  target: OparlEntityType;
}

/** Objects embedded only in their parent (e.g. agenda items in a meeting). */
export interface OparlChildSpec {
  source: string;
  type: OparlEntityType;
  /** The child's reference to the parent, set from the parent when the child omits it. */
  parentRef?: string;
}

export interface OparlTypeSpec {
  fields: OparlFieldSpec[];
  refs: OparlRefSpec[];
  joins: OparlJoinSpec[];
  children: OparlChildSpec[];
}

const text = (field: string): OparlFieldSpec => ({ field, kind: 'text' });
const date = (field: string): OparlFieldSpec => ({ field, kind: 'date' });
const datetime = (field: string): OparlFieldSpec => ({
  field,
  kind: 'datetime',
});
const bool = (field: string): OparlFieldSpec => ({ field, kind: 'boolean' });
const textArray = (field: string): OparlFieldSpec => ({
  field,
  kind: 'textArray',
});
const ref = (
  name: string,
  target: OparlEntityType,
  source = name,
): OparlRefSpec => ({ ref: name, source, target });
const join = (
  relation: string,
  source: string,
  target: OparlEntityType,
): OparlJoinSpec => ({ relation, source, target });

const T = OparlEntityType;

/**
 * What is mirrored of each OParl 1.0/1.1 type besides `id`, `web`,
 * `created`, `modified` and the original. Back-references (e.g. a file's
 * `paper`, a location's `meetings`) stay in the original only; their
 * forward references are mirrored.
 */
export const OPARL_TYPE_SPECS: Record<OparlEntityType, OparlTypeSpec> = {
  [T.BODY]: {
    fields: [
      text('name'),
      text('shortName'),
      text('website'),
      text('ags'),
      text('rgs'),
      text('classification'),
    ],
    refs: [ref('location', T.LOCATION)],
    joins: [],
    children: [{ source: 'legislativeTerm', type: T.LEGISLATIVE_TERM }],
  },
  [T.LEGISLATIVE_TERM]: {
    fields: [text('name'), date('startDate'), date('endDate')],
    refs: [],
    joins: [],
    children: [],
  },
  [T.ORGANIZATION]: {
    fields: [
      text('name'),
      text('shortName'),
      text('organizationType'),
      text('classification'),
      textArray('post'),
      date('startDate'),
      date('endDate'),
      text('website'),
    ],
    // Without `location`: for a small body it is the chair's home (AYC-2066).
    refs: [ref('subOrganizationOf', T.ORGANIZATION)],
    joins: [],
    children: [],
  },
  [T.PERSON]: {
    fields: [
      text('name'),
      text('familyName'),
      text('givenName'),
      text('formOfAddress'),
      text('affix'),
      textArray('title'),
      text('gender'),
      textArray('status'),
    ],
    refs: [],
    joins: [],
    children: [
      { source: 'membership', type: T.MEMBERSHIP, parentRef: 'person' },
    ],
  },
  [T.MEMBERSHIP]: {
    fields: [
      text('role'),
      bool('votingRight'),
      date('startDate'),
      date('endDate'),
    ],
    refs: [
      ref('person', T.PERSON),
      ref('organization', T.ORGANIZATION),
      ref('onBehalfOf', T.ORGANIZATION),
    ],
    joins: [],
    children: [],
  },
  [T.MEETING]: {
    fields: [
      text('name'),
      text('meetingState'),
      bool('cancelled'),
      datetime('start'),
      datetime('end'),
    ],
    refs: [
      ref('location', T.LOCATION),
      ref('invitation', T.FILE),
      ref('resultsProtocol', T.FILE),
      ref('verbatimProtocol', T.FILE),
    ],
    joins: [
      join('organizations', 'organization', T.ORGANIZATION),
      join('participants', 'participant', T.PERSON),
      join('auxiliaryFiles', 'auxiliaryFile', T.FILE),
    ],
    children: [
      { source: 'agendaItem', type: T.AGENDA_ITEM, parentRef: 'meeting' },
    ],
  },
  [T.AGENDA_ITEM]: {
    fields: [
      text('number'),
      { field: 'order', kind: 'integer' },
      text('name'),
      bool('public'),
      text('result'),
      text('resolutionText'),
      datetime('start'),
      datetime('end'),
    ],
    refs: [
      ref('meeting', T.MEETING),
      ref('consultation', T.CONSULTATION),
      ref('resolutionFile', T.FILE),
    ],
    joins: [join('auxiliaryFiles', 'auxiliaryFile', T.FILE)],
    children: [],
  },
  [T.PAPER]: {
    fields: [text('name'), text('reference'), date('date'), text('paperType')],
    refs: [ref('mainFile', T.FILE)],
    joins: [
      join('relatedPapers', 'relatedPaper', T.PAPER),
      join('superordinatedPapers', 'superordinatedPaper', T.PAPER),
      join('subordinatedPapers', 'subordinatedPaper', T.PAPER),
      join('auxiliaryFiles', 'auxiliaryFile', T.FILE),
      join('locations', 'location', T.LOCATION),
      join('originatorPersons', 'originatorPerson', T.PERSON),
      join('originatorOrganizations', 'originatorOrganization', T.ORGANIZATION),
      join('underDirectionOf', 'underDirectionOf', T.ORGANIZATION),
    ],
    children: [
      { source: 'consultation', type: T.CONSULTATION, parentRef: 'paper' },
    ],
  },
  [T.CONSULTATION]: {
    fields: [text('role'), bool('authoritative')],
    refs: [
      ref('paper', T.PAPER),
      ref('agendaItem', T.AGENDA_ITEM),
      ref('meeting', T.MEETING),
    ],
    joins: [join('organizations', 'organization', T.ORGANIZATION)],
    children: [],
  },
  [T.FILE]: {
    fields: [
      text('name'),
      text('fileName'),
      text('mimeType'),
      date('date'),
      { field: 'size', kind: 'integer' },
      text('sha1Checksum'),
      text('sha512Checksum'),
      text('accessUrl'),
      text('downloadUrl'),
      text('externalServiceUrl'),
      text('fileLicense'),
    ],
    refs: [ref('masterFile', T.FILE)],
    joins: [],
    children: [],
  },
  [T.LOCATION]: {
    fields: [
      text('description'),
      text('streetAddress'),
      text('room'),
      text('postalCode'),
      text('subLocality'),
      text('locality'),
    ],
    refs: [],
    joins: [],
    children: [],
  },
};

/**
 * The lists of a body, in sync order. Locations come last: one listed is
 * mirrored only as the place of something mirrored before, so persons'
 * addresses in the same list never are.
 */
export const OPARL_BODY_LISTS: ReadonlyArray<{
  property: string;
  type: OparlEntityType;
}> = [
  { property: 'organization', type: T.ORGANIZATION },
  { property: 'person', type: T.PERSON },
  { property: 'membership', type: T.MEMBERSHIP },
  { property: 'legislativeTermList', type: T.LEGISLATIVE_TERM },
  // 1.0 embeds the terms here; a URL instead is taken as their list.
  { property: 'legislativeTerm', type: T.LEGISLATIVE_TERM },
  { property: 'meeting', type: T.MEETING },
  { property: 'agendaItem', type: T.AGENDA_ITEM },
  { property: 'paper', type: T.PAPER },
  { property: 'consultation', type: T.CONSULTATION },
  { property: 'file', type: T.FILE },
  { property: 'locationList', type: T.LOCATION },
];
