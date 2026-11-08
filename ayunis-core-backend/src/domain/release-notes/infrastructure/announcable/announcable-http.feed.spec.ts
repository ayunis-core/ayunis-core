import {
  ProviderConnectionError,
  ProviderServerError,
} from 'src/common/errors/provider.errors';
import {
  AnnouncableFeedInvalidError,
  AnnouncableRequestRejectedError,
} from 'src/domain/release-notes/application/release-notes.errors';
import {
  TEST_ANNOUNCABLE_ORG_ID,
  TEST_IMAGE_SRC,
} from 'src/domain/release-notes/application/testing/release-note.fixtures';
import type { ConfigService } from '@nestjs/config';
import { AnnouncableHttpFeed } from './announcable-http.feed';

const feedAt = (origin: string) =>
  new AnnouncableHttpFeed({
    get: (key: string) =>
      key === 'releaseNotes.announcableOrigin' ? origin : undefined,
  } as unknown as ConfigService);

/** A note exactly as Announcable's widget feed sends it. */
function feedNote(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: 'Auto und Max Modus – Modellauswahl leicht gemacht',
    date: '05.11.2026',
    imageSrc: TEST_IMAGE_SRC,
    media_link: '',
    text: 'Neue Chats lassen sich jetzt noch einfacher starten.',
    last_update_on: '2026-11-05 14:13:59.695765 +0000 UTC',
    cta_label_override: 'Zur Anmeldung',
    cta_href_override: 'https://app.livestorm.co/locaboo/ayunis-core-einstieg',
    hide_cta: false,
    attentionMechanism: 'instant_open',
    ...overrides,
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('AnnouncableHttpFeed', () => {
  const feed = feedAt('https://release-notes.locaboo.de');
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => fetchMock.mockRestore());

  const requestedUrls = () =>
    fetchMock.mock.calls.map(([url]) => String(url as string));

  describe('fetchReleaseNotes', () => {
    it('reads the fields the sync relies on', async () => {
      fetchMock.mockResolvedValueOnce(json({ data: [feedNote('n1')] }));
      fetchMock.mockResolvedValueOnce(json({ data: [] }));

      await expect(
        feed.fetchReleaseNotes(TEST_ANNOUNCABLE_ORG_ID),
      ).resolves.toEqual([
        {
          id: 'n1',
          title: 'Auto und Max Modus – Modellauswahl leicht gemacht',
          text: 'Neue Chats lassen sich jetzt noch einfacher starten.',
          imageSrc: TEST_IMAGE_SRC,
          mediaLink: '',
          lastUpdateOn: '2026-11-05 14:13:59.695765 +0000 UTC',
          ctaLabelOverride: 'Zur Anmeldung',
          ctaHrefOverride:
            'https://app.livestorm.co/locaboo/ayunis-core-einstieg',
        },
      ]);
    });

    it('reads every page, stopping where Announcable repeats its last page', async () => {
      fetchMock
        .mockResolvedValueOnce(json({ data: [feedNote('n1'), feedNote('n2')] }))
        .mockResolvedValueOnce(json({ data: [feedNote('n3')] }))
        .mockResolvedValueOnce(json({ data: [feedNote('n3')] }));

      const notes = await feed.fetchReleaseNotes(TEST_ANNOUNCABLE_ORG_ID);

      expect(notes.map((note) => note.id)).toEqual(['n1', 'n2', 'n3']);
      expect(requestedUrls()).toEqual(
        [1, 2, 3].map(
          (page) =>
            `https://release-notes.locaboo.de/api/release-notes/${TEST_ANNOUNCABLE_ORG_ID}?for=widget&page=${page}`,
        ),
      );
    });

    it('counts a note that moved to the next page once', async () => {
      fetchMock
        .mockResolvedValueOnce(json({ data: [feedNote('n1'), feedNote('n2')] }))
        .mockResolvedValueOnce(json({ data: [feedNote('n2'), feedNote('n3')] }))
        .mockResolvedValueOnce(json({ data: [] }));

      const notes = await feed.fetchReleaseNotes(TEST_ANNOUNCABLE_ORG_ID);

      expect(notes.map((note) => note.id)).toEqual(['n1', 'n2', 'n3']);
    });

    it('leaves a note with an empty title for the sync to skip', async () => {
      fetchMock
        .mockResolvedValueOnce(json({ data: [feedNote('n1', { title: '' })] }))
        .mockResolvedValueOnce(json({ data: [] }));

      const [note] = await feed.fetchReleaseNotes(TEST_ANNOUNCABLE_ORG_ID);

      expect(note.title).toBe('');
    });

    it('reads empty optional fields as empty text', async () => {
      fetchMock
        .mockResolvedValueOnce(
          json({
            data: [
              feedNote('n1', {
                imageSrc: null,
                media_link: undefined,
                cta_label_override: null,
                cta_href_override: null,
              }),
            ],
          }),
        )
        .mockResolvedValueOnce(json({ data: [] }));

      const [note] = await feed.fetchReleaseNotes(TEST_ANNOUNCABLE_ORG_ID);

      expect(note).toMatchObject({
        imageSrc: '',
        mediaLink: '',
        ctaLabelOverride: '',
        ctaHrefOverride: '',
      });
    });

    it.each([
      ['no data list', { notes: [] }],
      ['a note without an id', { data: [feedNote('n1', { id: undefined })] }],
      ['a note without a title', { data: [feedNote('n1', { title: 42 })] }],
      [
        'a note without its last update',
        { data: [feedNote('n1', { last_update_on: null })] },
      ],
    ])('rejects a feed with %s', async (_label, body) => {
      fetchMock.mockResolvedValueOnce(json(body));

      await expect(
        feed.fetchReleaseNotes(TEST_ANNOUNCABLE_ORG_ID),
      ).rejects.toThrow(AnnouncableFeedInvalidError);
    });

    it('reads the feed of a stand-in for Announcable', async () => {
      fetchMock.mockResolvedValue(json({ data: [] }));

      await feedAt('http://127.0.0.1:3198').fetchReleaseNotes(
        TEST_ANNOUNCABLE_ORG_ID,
      );

      expect(requestedUrls()).toEqual([
        `http://127.0.0.1:3198/api/release-notes/${TEST_ANNOUNCABLE_ORG_ID}?for=widget&page=1`,
      ]);
    });

    it('rejects a feed that never ends', async () => {
      let page = 0;
      fetchMock.mockImplementation(() =>
        Promise.resolve(json({ data: [feedNote(`n${++page}`)] })),
      );

      await expect(
        feed.fetchReleaseNotes(TEST_ANNOUNCABLE_ORG_ID),
      ).rejects.toThrow(AnnouncableFeedInvalidError);
    });

    it('reports a client error as a rejected request', async () => {
      fetchMock.mockResolvedValueOnce(json({ error: 'not found' }, 404));

      await expect(
        feed.fetchReleaseNotes(TEST_ANNOUNCABLE_ORG_ID),
      ).rejects.toThrow(AnnouncableRequestRejectedError);
    });

    it('reports a server error as Announcable being unavailable', async () => {
      fetchMock.mockResolvedValueOnce(json({}, 503));

      await expect(
        feed.fetchReleaseNotes(TEST_ANNOUNCABLE_ORG_ID),
      ).rejects.toThrow(ProviderServerError);
    });

    it('reports a refused connection as Announcable being unreachable', async () => {
      fetchMock.mockRejectedValueOnce(
        new TypeError('fetch failed', {
          cause: Object.assign(new Error('connect ECONNREFUSED'), {
            code: 'ECONNREFUSED',
          }),
        }),
      );

      await expect(
        feed.fetchReleaseNotes(TEST_ANNOUNCABLE_ORG_ID),
      ).rejects.toThrow(ProviderConnectionError);
    });
  });

  describe('downloadImage', () => {
    it('downloads the image from its signed URL', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(Buffer.from('RIFF....WEBPVP8L'), { status: 200 }),
      );

      await expect(feed.downloadImage(TEST_IMAGE_SRC)).resolves.toEqual({
        status: 'downloaded',
        data: Buffer.from('RIFF....WEBPVP8L'),
      });
      expect(requestedUrls()).toEqual([TEST_IMAGE_SRC]);
    });

    it('accepts that Announcable refuses an image', async () => {
      fetchMock.mockResolvedValueOnce(new Response('', { status: 403 }));

      await expect(feed.downloadImage(TEST_IMAGE_SRC)).resolves.toEqual({
        status: 'rejected',
        reason: 'Announcable answered 403',
      });
    });

    it('fails on a server error, so the next sync downloads it again', async () => {
      fetchMock.mockResolvedValueOnce(new Response('', { status: 502 }));

      await expect(feed.downloadImage(TEST_IMAGE_SRC)).rejects.toThrow(
        ProviderServerError,
      );
    });

    it('downloads images only from the stand-in it reads the feed from', async () => {
      const standIn = feedAt('http://127.0.0.1:3198');

      await expect(standIn.downloadImage(TEST_IMAGE_SRC)).resolves.toEqual({
        status: 'rejected',
        reason: 'the image is not on Announcable',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not download an image from another host', async () => {
      await expect(
        feed.downloadImage('https://169.254.169.254/latest/meta-data'),
      ).resolves.toMatchObject({ status: 'rejected' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not follow a redirect away from Announcable', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: 'https://169.254.169.254/latest/meta-data' },
        }),
      );

      await expect(feed.downloadImage(TEST_IMAGE_SRC)).resolves.toEqual({
        status: 'rejected',
        reason: 'Announcable answered 302',
      });
      expect(fetchMock).toHaveBeenCalledWith(
        TEST_IMAGE_SRC,
        expect.objectContaining({ redirect: 'manual' }),
      );
    });

    it('does not follow a redirect of the feed', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(null, {
          status: 301,
          headers: { location: 'https://example.org/release-notes' },
        }),
      );

      await expect(
        feed.fetchReleaseNotes(TEST_ANNOUNCABLE_ORG_ID),
      ).rejects.toThrow(AnnouncableRequestRejectedError);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ redirect: 'manual' }),
      );
    });

    it('rejects an image larger than 10 MB', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(Buffer.alloc(10 * 1024 * 1024 + 1), { status: 200 }),
      );

      await expect(feed.downloadImage(TEST_IMAGE_SRC)).resolves.toMatchObject({
        status: 'rejected',
      });
    });
  });
});
