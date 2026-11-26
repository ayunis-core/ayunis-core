import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { login } from '../../src/clients/api/auth.client';
import {
  OPARL_TOOL_NOT_OFFERED,
  callOparlTool,
  createCouncilChat,
  findOparlCatalogBody,
  linkOparlBodies,
} from '../../src/clients/api/oparl.client';
import { createApiContext } from '../../src/factories/api-context.factory';
import { createOrg } from '../../src/factories/org.factory';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';

// Seeded council records of the minimal fixture (OparlCouncilSeeder).
const MUSTERSTADT = 'Gemeinde Musterstadt';
const BEISPIELHAUSEN = 'Ortsgemeinde Beispielhausen';
const MUSTERSTADT_PAPER = 'Erweiterung der Kita Sonnenschein';
const MUSTERSTADT_COMMITTEE = 'Ausschuss für Bildung und Soziales';
const BEISPIELHAUSEN_PAPER = 'Sanierung des Dorfgemeinschaftshauses';

interface SearchResult {
  type: string;
  url?: string;
  body: string;
  text: string;
  paper?: { id: string; name: string; url?: string };
  meeting?: { id: string };
  file?: { id: string; url: string };
}

interface CouncilIds {
  bodyId: string;
  paperId: string;
  meetingId: string;
  fileId: string;
}

async function adminOf(key: string, name: string) {
  const org = await createOrg(
    `${key}-${name}`,
    test.info().outputPath(`oparl-${name}-org.json`),
  );
  const api = await createApiContext({ cookies: [], origins: [] });
  await login(api, org.admin.email, org.admin.password);
  return api;
}

async function search(
  api: APIRequestContext,
  threadId: string,
  args: Record<string, unknown>,
): Promise<SearchResult[]> {
  const result = await callOparlTool(api, threadId, 'oparl_search', args);
  return (JSON.parse(result) as { results: SearchResult[] }).results;
}

/** What each council tool returns for Musterstadt's records to the user of `api`. */
async function readMusterstadt(
  api: APIRequestContext,
  threadId: string,
  ids: CouncilIds,
) {
  const call = (tool: Parameters<typeof callOparlTool>[2], args: object) =>
    callOparlTool(api, threadId, tool, args as Record<string, unknown>);
  return {
    search: await search(api, threadId, {
      queries: ['Kita Sonnenschein Erweiterung'],
      bodyIds: [ids.bodyId],
    }),
    searchAll: await search(api, threadId, { queries: ['Kita Sonnenschein'] }),
    searchInFile: await search(api, threadId, {
      queries: ['Kita Sonnenschein'],
      fileId: ids.fileId,
    }),
    searchOfMeeting: await search(api, threadId, {
      queries: ['Kita Sonnenschein'],
      meetingId: ids.meetingId,
      types: ['agenda_item'],
    }),
    searchOfPaper: await search(api, threadId, {
      queries: ['Kita Sonnenschein'],
      paperId: ids.paperId,
    }),
    paper: await call('oparl_get', { id: ids.paperId }),
    meeting: await call('oparl_get', { id: ids.meetingId }),
    file: await call('oparl_read_file', { fileId: ids.fileId }),
    meetings: JSON.parse(
      await call('oparl_list', { type: 'meetings', bodyIds: [ids.bodyId] }),
    ) as { total: number },
    organizations: await call('oparl_list', { type: 'organizations' }),
  };
}

test('a user of another org gets nothing of a council body only one org linked until their own admin links it', async ({
  mail,
}) => {
  test.setTimeout(240_000);
  const key = randomUUID().slice(0, 8);
  const adminA = await adminOf(key, 'a');
  const adminB = await adminOf(key, 'b');
  const { api: userB } = await createMemberSession(adminB, mail, `oparl-${key}`);
  try {
    const musterstadt = await findOparlCatalogBody(adminA, MUSTERSTADT);
    const beispielhausen = await findOparlCatalogBody(adminB, BEISPIELHAUSEN);
    await linkOparlBodies(adminA, [musterstadt.id]);

    // Org A reads Musterstadt, and cites it by its RIS links.
    const chatA = await createCouncilChat(adminA);
    const found = await search(adminA, chatA, { queries: ['Kita Sonnenschein'] });
    const document = found.find((result) => result.type === 'file');
    const paperHit = found.find((result) => result.type === 'paper');
    expect(paperHit).toMatchObject({
      body: MUSTERSTADT,
      paper: { name: MUSTERSTADT_PAPER, url: expect.stringMatching(/^https:/) },
      url: paperHit?.paper?.url,
    });
    expect(document?.url).toBe(document?.file?.url);
    // The agenda item deliberating the paper names its meeting.
    const agendaItemHit = found.find((result) => result.type === 'agenda_item');
    const ids: CouncilIds = {
      bodyId: musterstadt.id,
      paperId: paperHit!.paper!.id,
      meetingId: agendaItemHit?.meeting?.id ?? '',
      fileId: document!.file!.id,
    };
    expect(ids.meetingId).not.toBe('');

    // Org B without any link: no council tools at all.
    const chatB = await createCouncilChat(userB);
    expect(
      await callOparlTool(userB, chatB, 'oparl_search', { queries: ['Kita'] }),
    ).toBe(OPARL_TOOL_NOT_OFFERED);

    // Org B with only Beispielhausen linked: the tools, but nothing of Musterstadt.
    await linkOparlBodies(adminB, [beispielhausen.id]);
    const denied = await readMusterstadt(userB, chatB, ids);
    expect(denied.search).toEqual([]);
    expect(denied.searchAll.map((result) => result.body)).not.toContain(
      MUSTERSTADT,
    );
    expect(denied.searchInFile).toEqual([]);
    expect(denied.searchOfMeeting).toEqual([]);
    expect(denied.searchOfPaper).toEqual([]);
    expect(denied.paper).toMatch(/^No paper, meeting, organization or person/);
    expect(denied.meeting).toMatch(/^No paper, meeting, organization or person/);
    expect(denied.file).toMatch(/^No document with ID/);
    expect(denied.meetings.total).toBe(0);
    expect(denied.organizations).not.toContain(MUSTERSTADT_COMMITTEE);
    const own = await search(userB, chatB, { queries: ['Dorfgemeinschaftshaus'] });
    expect(own.map((result) => result.paper?.name)).toContain(
      BEISPIELHAUSEN_PAPER,
    );

    // Once org B's admin links Musterstadt, the same calls return it.
    await linkOparlBodies(adminB, [musterstadt.id]);
    const allowed = await readMusterstadt(userB, chatB, ids);
    expect(allowed.search.map((result) => result.paper?.id)).toContain(
      ids.paperId,
    );
    expect(allowed.searchAll.map((result) => result.body)).toContain(
      MUSTERSTADT,
    );
    expect(allowed.searchInFile.length).toBeGreaterThan(0);
    expect(
      allowed.searchInFile.every((result) => result.file?.id === ids.fileId),
    ).toBe(true);
    expect(allowed.searchOfMeeting).toEqual([
      expect.objectContaining({
        type: 'agenda_item',
        meeting: expect.objectContaining({ id: ids.meetingId }),
      }),
    ]);
    expect(allowed.searchOfPaper.map((result) => result.paper?.id)).toEqual(
      expect.arrayContaining([ids.paperId]),
    );
    expect(JSON.parse(allowed.paper)).toMatchObject({
      type: 'paper',
      name: MUSTERSTADT_PAPER,
      consultations: [
        {
          meeting: { id: ids.meetingId },
          agendaItem: { result: 'einstimmig beschlossen' },
        },
      ],
    });
    expect(JSON.parse(allowed.meeting)).toMatchObject({ type: 'meeting' });
    expect(JSON.parse(allowed.file)).toMatchObject({
      pageCount: 2,
      pages: [
        { number: 1, text: expect.stringContaining('Kita Sonnenschein') },
        { number: 2 },
      ],
      nextPage: null,
    });
    expect(allowed.meetings.total).toBe(1);
    expect(allowed.organizations).toContain(MUSTERSTADT_COMMITTEE);
  } finally {
    await userB.dispose();
    await adminA.dispose();
    await adminB.dispose();
  }
});

test('the council tools answer invalid parameters with an error the model can act on', async ({
  api,
}) => {
  const body = await findOparlCatalogBody(api, BEISPIELHAUSEN);
  await linkOparlBodies(api, [body.id]);
  const chat = await createCouncilChat(api);

  const result = await callOparlTool(api, chat, 'oparl_search', {
    queries: ['Haushalt'],
    from: '2026-05-01',
    to: '2026-04-01',
  });

  expect(result).toContain("'from' must not be after 'to'");
});
