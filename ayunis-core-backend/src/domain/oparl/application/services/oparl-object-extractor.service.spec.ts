import { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';
import { OparlObjectExtractor } from './oparl-object-extractor.service';

const BASE = 'https://rim.ekom21.de/aarbergen/webservice/oparl/v1.1/body/1';

const person = {
  id: `${BASE}/person/67`,
  type: 'https://schema.oparl.org/1.1/Person',
  name: 'Herr Karsten Bach',
  familyName: 'Bach',
  email: ['karsten.bach@example.org'],
  phone: ['+49 6120 0000'],
  location: `${BASE}/location/1-41`,
  locationObject: {
    id: `${BASE}/location/1-41`,
    type: 'https://schema.oparl.org/1.1/Location',
    streetAddress: 'Hauser Weg 10',
    postalCode: '65326',
  },
  membership: [
    {
      id: `${BASE}/membership/14-1-1-67`,
      type: 'https://schema.oparl.org/1.1/Membership',
      organization: `${BASE}/organization/1-1`,
      role: 'Beigeordneter',
      votingRight: true,
      startDate: '2011-04-01',
      modified: '2013-07-26T08:31:21+02:00',
    },
  ],
  modified: '2026-10-20T11:44:47+02:00',
};

const meeting = {
  id: `${BASE}/meeting/443`,
  type: 'https://schema.oparl.org/1.1/Meeting',
  name: 'Gemeindevertretung (7. Sitzung)',
  start: '2013-11-14T20:02:00+01:00',
  organization: [`${BASE}/organization/1-3`],
  participant: [{ ...person, id: `${BASE}/person/68` }],
  location: {
    id: `${BASE}/location/2-12`,
    type: 'https://schema.oparl.org/1.1/Location',
    room: 'Kirchfeldhalle, Saal',
  },
  invitation: {
    id: `${BASE}/file/1-2053`,
    type: 'https://schema.oparl.org/1.1/File',
    name: 'Bekanntmachung',
    size: 48213,
  },
  agendaItem: [
    {
      id: `${BASE}/agendaitem/1751`,
      type: 'https://schema.oparl.org/1.1/AgendaItem',
      number: '1.1',
      order: 3,
      resolutionFile: {
        id: `${BASE}/file/1-2389`,
        type: 'https://schema.oparl.org/1.1/File',
      },
    },
    { id: `${BASE}/agendaitem/1500`, deleted: true },
  ],
};

describe('OparlObjectExtractor', () => {
  const extractor = new OparlObjectExtractor();

  it('stores a person without email, phone and address, in its row and in what embeds it', () => {
    const { objects } = extractor.extract(meeting, OparlEntityType.MEETING);
    const stored = JSON.stringify(objects.map((object) => object.raw));

    expect(stored).not.toMatch(/email|phone|Hauser Weg|65326|locationObject/);
    expect(stored).not.toContain('location/1-41');
    expect(
      objects.filter((object) => object.type === OparlEntityType.LOCATION),
    ).toEqual([expect.objectContaining({ oparlId: `${BASE}/location/2-12` })]);
  });

  it("stores an organization without its address, which may be the chair's home", () => {
    const ortsbeirat = {
      id: `${BASE}/organization/2-7`,
      type: 'https://schema.oparl.org/1.1/Organization',
      name: 'Ortsbeirat Michelbach',
      location: {
        id: `${BASE}/location/1-77`,
        type: 'https://schema.oparl.org/1.1/Location',
        streetAddress: 'Am Hang 3',
        postalCode: '65326',
        locality: 'Aarbergen',
      },
      modified: '2026-10-20T11:44:47+02:00',
    };

    for (const location of [ortsbeirat.location, ortsbeirat.location.id]) {
      const { objects } = extractor.extract(
        { ...ortsbeirat, location },
        OparlEntityType.ORGANIZATION,
      );

      expect(objects).toHaveLength(1);
      expect(JSON.stringify(objects[0])).not.toMatch(/location|Am Hang/);
    }
  });

  it("mirrors a listed person's embedded memberships with the person as their reference", () => {
    const { objects } = extractor.extract(person, OparlEntityType.PERSON);

    expect(objects.map(({ type, embedded }) => ({ type, embedded }))).toEqual([
      { type: OparlEntityType.PERSON, embedded: false },
      { type: OparlEntityType.MEMBERSHIP, embedded: true },
    ]);
    expect(objects[1].refs).toEqual({
      person: person.id,
      organization: `${BASE}/organization/1-1`,
      onBehalfOf: null,
    });
    expect(objects[1].fields).toMatchObject({
      votingRight: true,
      startDate: '2011-04-01',
    });
  });

  it('mirrors objects embedded at any depth and reports embedded deletions', () => {
    const { objects, deleted } = extractor.extract(
      meeting,
      OparlEntityType.MEETING,
    );

    expect(objects.map((object) => [object.type, object.oparlId])).toEqual(
      expect.arrayContaining([
        [OparlEntityType.MEETING, meeting.id],
        [OparlEntityType.PERSON, `${BASE}/person/68`],
        [OparlEntityType.FILE, `${BASE}/file/1-2053`],
        [OparlEntityType.AGENDA_ITEM, `${BASE}/agendaitem/1751`],
        [OparlEntityType.FILE, `${BASE}/file/1-2389`],
      ]),
    );
    const agendaItem = objects.find(
      (object) => object.type === OparlEntityType.AGENDA_ITEM,
    );
    expect(agendaItem?.refs).toMatchObject({
      meeting: meeting.id,
      resolutionFile: `${BASE}/file/1-2389`,
    });
    expect(objects[0].refs.invitation).toBe(`${BASE}/file/1-2053`);
    expect(objects[0].joins.participants).toEqual([`${BASE}/person/68`]);
    expect(deleted).toEqual([
      { type: OparlEntityType.AGENDA_ITEM, oparlId: `${BASE}/agendaitem/1500` },
    ]);
  });

  it('drops values a column cannot hold instead of failing the page', () => {
    const { objects } = extractor.extract(
      {
        id: `${BASE}/paper/1`,
        date: '2013-02-30',
        modified: 'gestern',
        reference: 42,
      },
      OparlEntityType.PAPER,
    );

    expect(objects[0].fields).toMatchObject({ date: null, reference: '42' });
    expect(objects[0].oparlModified).toBeNull();
  });
});
