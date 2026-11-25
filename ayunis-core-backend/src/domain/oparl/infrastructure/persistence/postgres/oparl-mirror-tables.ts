import { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';
import {
  OPARL_TYPE_SPECS,
  type OparlFieldKind,
} from 'src/domain/oparl/application/models/oparl-type-specs';

const T = OparlEntityType;

export const OPARL_TABLES: Record<OparlEntityType, string> = {
  [T.BODY]: 'oparl_bodies',
  [T.LEGISLATIVE_TERM]: 'oparl_legislative_terms',
  [T.ORGANIZATION]: 'oparl_organizations',
  [T.PERSON]: 'oparl_persons',
  [T.MEMBERSHIP]: 'oparl_memberships',
  [T.MEETING]: 'oparl_meetings',
  [T.AGENDA_ITEM]: 'oparl_agenda_items',
  [T.PAPER]: 'oparl_papers',
  [T.CONSULTATION]: 'oparl_consultations',
  [T.FILE]: 'oparl_files',
  [T.LOCATION]: 'oparl_locations',
};

const JOIN_TABLES: Record<string, string> = {
  'meeting.organizations': 'oparl_meeting_organizations',
  'meeting.participants': 'oparl_meeting_participants',
  'meeting.auxiliaryFiles': 'oparl_meeting_auxiliary_files',
  'agenda_item.auxiliaryFiles': 'oparl_agenda_item_auxiliary_files',
  'paper.relatedPapers': 'oparl_paper_related_papers',
  'paper.superordinatedPapers': 'oparl_paper_superordinated_papers',
  'paper.subordinatedPapers': 'oparl_paper_subordinated_papers',
  'paper.auxiliaryFiles': 'oparl_paper_auxiliary_files',
  'paper.locations': 'oparl_paper_locations',
  'paper.originatorPersons': 'oparl_paper_originator_persons',
  'paper.originatorOrganizations': 'oparl_paper_originator_organizations',
  'paper.underDirectionOf': 'oparl_paper_under_direction_of',
  'consultation.organizations': 'oparl_consultation_organizations',
};

/**
 * References whose foreign key cascades: removing the target removes the
 * row. Must match `onDelete: 'CASCADE'` in the records.
 */
export const OPARL_CASCADE_REFS: Partial<
  Record<OparlEntityType, Array<{ ref: string; target: OparlEntityType }>>
> = {
  [T.MEMBERSHIP]: [
    { ref: 'person', target: T.PERSON },
    { ref: 'organization', target: T.ORGANIZATION },
  ],
  [T.AGENDA_ITEM]: [{ ref: 'meeting', target: T.MEETING }],
  [T.CONSULTATION]: [{ ref: 'paper', target: T.PAPER }],
};

/** Leaves first, so cascades from a parent never remove what is counted later. */
export const OPARL_DELETE_ORDER: OparlEntityType[] = [
  T.AGENDA_ITEM,
  T.CONSULTATION,
  T.MEMBERSHIP,
  T.MEETING,
  T.PAPER,
  T.FILE,
  T.LOCATION,
  T.LEGISLATIVE_TERM,
  T.PERSON,
  T.ORGANIZATION,
  T.BODY,
];

export interface OparlColumn {
  name: string;
  sqlType: string;
}

export interface OparlRefColumn {
  ref: string;
  targetTable: string;
}

export interface OparlJoinTable {
  relation: string;
  table: string;
  targetTable: string;
}

export interface OparlTable {
  type: OparlEntityType;
  name: string;
  bodyScoped: boolean;
  fields: OparlColumn[];
  refs: OparlRefColumn[];
  joins: OparlJoinTable[];
}

const SQL_TYPES: Record<OparlFieldKind, string> = {
  text: 'text',
  date: 'date',
  datetime: 'timestamptz',
  boolean: 'boolean',
  integer: 'integer',
  textArray: 'text[]',
};

function sqlType(type: OparlEntityType, field: string, kind: OparlFieldKind) {
  return type === T.FILE && field === 'size' ? 'bigint' : SQL_TYPES[kind];
}

export function oparlTable(type: OparlEntityType): OparlTable {
  const spec = OPARL_TYPE_SPECS[type];
  return {
    type,
    name: OPARL_TABLES[type],
    bodyScoped: type !== T.BODY,
    fields: spec.fields.map(({ field, kind }) => ({
      name: field,
      sqlType: sqlType(type, field, kind),
    })),
    refs: spec.refs.map(({ ref, target }) => ({
      ref,
      targetTable: OPARL_TABLES[target],
    })),
    joins: spec.joins.map(({ relation, target }) => ({
      relation,
      table: JOIN_TABLES[`${type}.${relation}`],
      targetTable: OPARL_TABLES[target],
    })),
  };
}

/** The columns and join tables that reference a location, i.e. make it a place of something. */
export function locationReferences(): Array<
  | { kind: 'ref'; table: string; column: string }
  | { kind: 'join'; table: string; ownerTable: string }
> {
  return Object.values(T).flatMap((type) => {
    const table = oparlTable(type);
    const spec = OPARL_TYPE_SPECS[type];
    return [
      ...spec.refs
        .filter((r) => r.target === T.LOCATION)
        .map((r) => ({
          kind: 'ref' as const,
          table: table.name,
          column: `${r.ref}OparlId`,
        })),
      ...table.joins
        .filter((j) => j.targetTable === OPARL_TABLES[T.LOCATION])
        .map((j) => ({
          kind: 'join' as const,
          table: j.table,
          ownerTable: table.name,
        })),
    ];
  });
}
