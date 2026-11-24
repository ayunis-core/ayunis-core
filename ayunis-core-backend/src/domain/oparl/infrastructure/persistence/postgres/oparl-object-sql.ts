import { AGENDA_ITEM_PAPER, ISO, PERSON_NAME } from './oparl-read-sql';

/*
 * One statement per object type, with its references as JSON. Parameters:
 * $1 the object's ID, $2 the scope's body IDs. Every referenced row must be
 * of a body in the scope too, so nothing of another body is named.
 */

const IN_SCOPE = (alias: string) => `${alias}."bodyId" = ANY($2::varchar[])`;
const NAME = (alias: string) => `${alias}.name`;

const BODY_JSON = `json_build_object('id', b.id, 'name', b.name)`;

const REF = (alias: string, name = NAME) =>
  `CASE WHEN ${alias}.id IS NULL THEN NULL ELSE json_build_object('id', ${alias}.id, 'name', ${name(alias)}) END`;

const FILE_JSON = (alias: string) =>
  `json_build_object('id', ${alias}.id, 'name', ${alias}.name, 'fileName', ${alias}."fileName",
    'mimeType', ${alias}."mimeType", 'date', ${alias}.date::text, 'accessUrl', ${alias}."accessUrl",
    'web', ${alias}.web)`;

const FILE_REF = (alias: string) =>
  `CASE WHEN ${alias}.id IS NULL THEN NULL ELSE ${FILE_JSON(alias)} END`;

const PAPER_JSON = (alias: string) =>
  `json_build_object('id', ${alias}.id, 'name', ${alias}.name, 'reference', ${alias}.reference, 'web', ${alias}.web)`;

function joined(
  joinTable: string,
  targetTable: string,
  owner: string,
  json: (alias: string) => string,
  order: (alias: string) => string,
): string {
  return `(SELECT coalesce(json_agg(${json('t')} ORDER BY ${order('t')}, t.id), '[]'::json)
    FROM ${joinTable} j JOIN ${targetTable} t ON t.id = j."targetId" AND ${IN_SCOPE('t')}
    WHERE j."ownerId" = ${owner})`;
}

const FILES = (joinTable: string, owner: string) =>
  joined(
    joinTable,
    'oparl_files',
    owner,
    FILE_JSON,
    (t) => `${t}.date NULLS LAST, ${t}.name`,
  );

const REFS = (
  joinTable: string,
  targetTable: string,
  owner: string,
  name = NAME,
) =>
  joined(
    joinTable,
    targetTable,
    owner,
    (t) => `json_build_object('id', ${t}.id, 'name', ${name(t)})`,
    (t) => `${name(t)} NULLS LAST`,
  );

const PAPERS = (joinTable: string, owner: string) =>
  joined(
    joinTable,
    'oparl_papers',
    owner,
    PAPER_JSON,
    (t) => `${t}.date DESC NULLS LAST`,
  );

/**
 * The paper's consultations; one at a meeting or agenda item of a body
 * outside the scope is left out, so the paper's way through another body's
 * committees stays hidden.
 */
const CONSULTATIONS = `(
  SELECT coalesce(json_agg(json_build_object(
      'role', k.role,
      'authoritative', k.authoritative,
      'organizations', ${REFS('oparl_consultation_organizations', 'oparl_organizations', 'k.id')},
      'meeting', CASE WHEN km.id IS NULL THEN NULL ELSE json_build_object(
        'id', km.id, 'name', km.name, 'start', km.start, 'web', km.web) END,
      'agendaItem', CASE WHEN ka.id IS NULL THEN NULL ELSE json_build_object(
        'id', ka.id, 'number', ka.number, 'name', ka.name, 'result', ka.result,
        'resolutionText', ka."resolutionText", 'web', ka.web) END)
    ORDER BY km.start NULLS LAST, k.id), '[]'::json)
  FROM oparl_consultations k
  LEFT JOIN oparl_agenda_items ka ON ka.id = k."agendaItemId" AND ${IN_SCOPE('ka')}
  LEFT JOIN oparl_meetings km ON km.id = coalesce(k."meetingId", ka."meetingId") AND ${IN_SCOPE('km')}
  WHERE k."paperId" = p.id AND ${IN_SCOPE('k')}
    AND (k."agendaItemId" IS NULL OR ka.id IS NOT NULL)
    AND (k."meetingId" IS NULL OR km.id IS NOT NULL))`;

export const PAPER_SQL = `
  SELECT p.id, ${BODY_JSON} AS body, p.name, p.reference, p."paperType",
    p.date::text AS date, p.web,
    ${FILE_REF('mf')} AS "mainFile",
    ${FILES('oparl_paper_auxiliary_files', 'p.id')} AS "auxiliaryFiles",
    ${REFS('oparl_paper_originator_persons', 'oparl_persons', 'p.id', PERSON_NAME)} AS "originatorPersons",
    ${REFS('oparl_paper_originator_organizations', 'oparl_organizations', 'p.id')} AS "originatorOrganizations",
    ${REFS('oparl_paper_under_direction_of', 'oparl_organizations', 'p.id')} AS "underDirectionOf",
    ${PAPERS('oparl_paper_related_papers', 'p.id')} AS "relatedPapers",
    ${PAPERS('oparl_paper_superordinated_papers', 'p.id')} AS "superordinatedPapers",
    ${PAPERS('oparl_paper_subordinated_papers', 'p.id')} AS "subordinatedPapers",
    ${CONSULTATIONS} AS consultations
  FROM oparl_papers p
  JOIN oparl_bodies b ON b.id = p."bodyId"
  LEFT JOIN oparl_files mf ON mf.id = p."mainFileId" AND ${IN_SCOPE('mf')}
  WHERE p.id = $1 AND ${IN_SCOPE('p')}`;

const AGENDA_ITEMS = `(
  SELECT coalesce(json_agg(json_build_object(
      'id', a.id, 'number', a.number, 'order', a."order", 'name', a.name,
      'public', a.public, 'result', a.result, 'resolutionText', a."resolutionText",
      'web', a.web,
      'paper', CASE WHEN ap.id IS NULL THEN NULL ELSE ${PAPER_JSON('ap')} END,
      'resolutionFile', ${FILE_REF('arf')},
      'auxiliaryFiles', ${FILES('oparl_agenda_item_auxiliary_files', 'a.id')})
    ORDER BY a."order" NULLS LAST, a.number NULLS LAST, a.id), '[]'::json)
  FROM oparl_agenda_items a
  ${AGENDA_ITEM_PAPER}
  LEFT JOIN oparl_papers ap ON ap.id = ak."paperId" AND ${IN_SCOPE('ap')}
  LEFT JOIN oparl_files arf ON arf.id = a."resolutionFileId" AND ${IN_SCOPE('arf')}
  WHERE a."meetingId" = m.id)`;

export const MEETING_SQL = `
  SELECT m.id, ${BODY_JSON} AS body, m.name, ${ISO('m.start')} AS start,
    ${ISO('m."end"')} AS "end", m."meetingState", m.cancelled, m.web,
    CASE WHEN l.id IS NULL THEN NULL ELSE json_build_object(
      'description', l.description, 'streetAddress', l."streetAddress", 'room', l.room,
      'postalCode', l."postalCode", 'locality', l.locality) END AS location,
    ${REFS('oparl_meeting_organizations', 'oparl_organizations', 'm.id')} AS organizations,
    ${REFS('oparl_meeting_participants', 'oparl_persons', 'm.id', PERSON_NAME)} AS participants,
    ${FILE_REF('inv')} AS invitation,
    ${FILE_REF('rp')} AS "resultsProtocol",
    ${FILE_REF('vp')} AS "verbatimProtocol",
    ${FILES('oparl_meeting_auxiliary_files', 'm.id')} AS "auxiliaryFiles",
    ${AGENDA_ITEMS} AS "agendaItems"
  FROM oparl_meetings m
  JOIN oparl_bodies b ON b.id = m."bodyId"
  LEFT JOIN oparl_locations l ON l.id = m."locationId" AND ${IN_SCOPE('l')}
  LEFT JOIN oparl_files inv ON inv.id = m."invitationId" AND ${IN_SCOPE('inv')}
  LEFT JOIN oparl_files rp ON rp.id = m."resultsProtocolId" AND ${IN_SCOPE('rp')}
  LEFT JOIN oparl_files vp ON vp.id = m."verbatimProtocolId" AND ${IN_SCOPE('vp')}
  WHERE m.id = $1 AND ${IN_SCOPE('m')}`;

const MEMBERSHIP_COUNTERPARTS = {
  organizationId: {
    json: `'person', ${REF('mp', PERSON_NAME)}`,
    join: `JOIN oparl_persons mp ON mp.id = ms."personId" AND ${IN_SCOPE('mp')}`,
  },
  personId: {
    json: `'organization', ${REF('mo')}`,
    join: `JOIN oparl_organizations mo ON mo.id = ms."organizationId" AND ${IN_SCOPE('mo')}`,
  },
};

/**
 * Memberships of the owner ($1 by `column`), current ones first, each with
 * the other side: an organization's with the person, a person's with the
 * organization. A membership whose other side is not of a body in the scope
 * is left out.
 */
const MEMBERSHIPS = (column: keyof typeof MEMBERSHIP_COUNTERPARTS) => `(
  SELECT coalesce(json_agg(json_build_object(
      ${MEMBERSHIP_COUNTERPARTS[column].json},
      'role', ms.role, 'votingRight', ms."votingRight",
      'startDate', ms."startDate"::text, 'endDate', ms."endDate"::text,
      'onBehalfOf', ${REF('mb')})
    ORDER BY (ms."endDate" IS NULL OR ms."endDate" >= current_date) DESC,
      ms."startDate" DESC NULLS LAST, ms.id), '[]'::json)
  FROM oparl_memberships ms
  ${MEMBERSHIP_COUNTERPARTS[column].join}
  LEFT JOIN oparl_organizations mb ON mb.id = ms."onBehalfOfId" AND ${IN_SCOPE('mb')}
  WHERE ms."${column}" = $1 AND ${IN_SCOPE('ms')})`;

export const ORGANIZATION_SQL = `
  SELECT o.id, ${BODY_JSON} AS body, o.name, o."shortName", o."organizationType",
    o.classification, o."startDate"::text AS "startDate", o."endDate"::text AS "endDate",
    o.website, o.web,
    ${REF('so')} AS "subOrganizationOf",
    ${MEMBERSHIPS('organizationId')} AS memberships
  FROM oparl_organizations o
  JOIN oparl_bodies b ON b.id = o."bodyId"
  LEFT JOIN oparl_organizations so ON so.id = o."subOrganizationOfId" AND ${IN_SCOPE('so')}
  WHERE o.id = $1 AND ${IN_SCOPE('o')}`;

export const PERSON_SQL = `
  SELECT x.id, ${BODY_JSON} AS body, ${PERSON_NAME('x')} AS name, x."formOfAddress",
    coalesce(x.title, '{}') AS title, x.affix, coalesce(x.status, '{}') AS status, x.web,
    ${MEMBERSHIPS('personId')} AS memberships
  FROM oparl_persons x
  JOIN oparl_bodies b ON b.id = x."bodyId"
  WHERE x.id = $1 AND ${IN_SCOPE('x')}`;
