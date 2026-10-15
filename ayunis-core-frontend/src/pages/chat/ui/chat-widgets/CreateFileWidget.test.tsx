import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import { PiiMaskProvider } from '@/widgets/markdown';
import CreateFileWidget from './CreateFileWidget';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function content(params: Record<string, unknown>): ToolUseMessageContent {
  return {
    type: 'tool_use',
    id: 'file-1',
    name: 'create_file',
    params,
  };
}
const params = {
  filename: 'Bürgerbericht',
  format: 'xml',
  content: '<name>Jörg</name>\n',
};
let blobs: Blob[];
let filenames: string[];

beforeEach(() => {
  blobs = [];
  filenames = [];
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:file';
    }),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    filenames.push(this.download);
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function download() {
  fireEvent.click(screen.getByTestId('create-file-download'));
}
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(blob);
  });
}

describe('CreateFileWidget', () => {
  it.each([
    ['xml', 'application/xml'],
    ['json', 'application/json'],
    ['txt', 'text/plain'],
  ])('downloads %s with exact UTF-8 content', async (format, mime) => {
    render(<CreateFileWidget content={content({ ...params, format })} />);
    expect(screen.getByText(`Bürgerbericht.${format}`)).toBeDefined();
    expect(screen.queryByText(params.content)).toBeNull();
    download();
    expect(filenames).toEqual([`Bürgerbericht.${format}`]);
    expect(blobs[0].type).toBe(`${mime};charset=utf-8`);
    expect(await readBlob(blobs[0])).toBe(params.content);
    await vi.waitFor(() =>
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:file'),
    );
  });

  it.each([
    ['Bericht.xml', 'Bericht.xml'],
    ['Bericht.json', 'Bericht.xml'],
    ['Bericht.xml.xml', 'Bericht.xml'],
    ['Bericht.final.xml', 'Bericht.final.xml'],
    ['Bericht.final', 'Bericht.final.xml'],
    ['budget.2024', 'budget.2024.xml'],
    ['Be/richt\\:*?"<>|.xml', 'Bericht.xml'],
    ['', 'datei.xml'],
    ['   ', 'datei.xml'],
    ['.xml', 'datei.xml'],
  ])('normalizes filename %j to %j', (filename, expected) => {
    render(<CreateFileWidget content={content({ ...params, filename })} />);
    download();
    expect(filenames).toEqual([expected]);
  });

  it('keeps downloads disabled while streaming even with valid partial params', () => {
    const { rerender } = render(
      <CreateFileWidget content={content({})} isStreaming />,
    );
    expect(
      screen.getByTestId('create-file-download').hasAttribute('disabled'),
    ).toBe(true);
    rerender(<CreateFileWidget content={content(params)} isStreaming />);
    download();
    expect(blobs).toHaveLength(0);
    rerender(<CreateFileWidget content={content(params)} />);
    download();
    expect(blobs).toHaveLength(1);
  });

  it.each([
    { ...params, format: 'html' },
    { ...params, content: 42 },
    { ...params, content: 'a'.repeat(100001) },
    { ...params, filename: 'a'.repeat(201) },
    {},
  ])('disables malformed historical parameters', (invalid) => {
    render(<CreateFileWidget content={content(invalid)} />);
    expect(
      screen.getByTestId('create-file-download').hasAttribute('disabled'),
    ).toBe(true);
  });

  it('resolves anonymous tokens using the real thread mask provider on download', async () => {
    render(
      <PiiMaskProvider
        masks={[
          {
            id: 'mask-1',
            token: '{{pii:PERSON_NAME_1}}',
            value: 'Jörg Müller',
            category: 'person_name',
            unmasked: false,
          },
        ]}
      >
        <CreateFileWidget
          content={content({
            ...params,
            content: '<name>{{pii:PERSON_NAME_1}}</name>',
          })}
        />
      </PiiMaskProvider>,
    );
    download();
    expect(await readBlob(blobs[0])).toBe('<name>Jörg Müller</name>');
  });

  it('downloads empty content again after remounting persisted tool arguments', async () => {
    const persisted = content({ ...params, content: '' });
    const view = render(<CreateFileWidget content={persisted} />);
    download();
    view.unmount();
    render(<CreateFileWidget content={persisted} />);
    download();
    expect(filenames).toEqual(['Bürgerbericht.xml', 'Bürgerbericht.xml']);
    expect(await readBlob(blobs[1])).toBe('');
  });
});

it.each([
  [
    'json',
    '{"name":"{{pii:ORGANIZATION_1}}"}',
    '{"name":"Firma \\"Nord\\"\\\\West"}',
  ],
  [
    'xml',
    '<name>{{pii:ORGANIZATION_1}}</name>',
    '<name>Firma &quot;Nord&quot;\\West</name>',
  ],
  ['txt', '{{pii:ORGANIZATION_1}}', 'Firma "Nord"\\West'],
])(
  'escapes restored values for %s without rewriting the file',
  async (format, template, expected) => {
    render(
      <PiiMaskProvider
        masks={[
          {
            id: 'org-mask',
            token: '{{pii:ORGANIZATION_1}}',
            value: 'Firma "Nord"\\West',
            category: 'organization',
            unmasked: false,
          },
        ]}
      >
        <CreateFileWidget
          content={content({ ...params, format, content: template })}
        />
      </PiiMaskProvider>,
    );
    download();
    expect(await readBlob(blobs[0])).toBe(expected);
  },
);

it('escapes XML entity characters in restored values', async () => {
  render(
    <PiiMaskProvider
      masks={[
        {
          id: 'org-mask',
          token: '{{pii:ORGANIZATION_1}}',
          value: "Müller & <Söhne> 'Nord'",
          category: 'organization',
          unmasked: false,
        },
      ]}
    >
      <CreateFileWidget
        content={content({
          ...params,
          content: '<name>{{pii:ORGANIZATION_1}}</name>',
        })}
      />
    </PiiMaskProvider>,
  );
  download();
  expect(await readBlob(blobs[0])).toBe(
    '<name>Müller &amp; &lt;Söhne&gt; &apos;Nord&apos;</name>',
  );
});

it('restores filename tokens before sanitizing the original value', async () => {
  render(
    <PiiMaskProvider
      masks={[
        {
          id: 'filename-mask',
          token: '{{pii:PERSON_NAME_1}}',
          value: 'Müller/Nord:West',
          category: 'person_name',
          unmasked: false,
        },
      ]}
    >
      <CreateFileWidget
        content={content({ ...params, filename: '{{pii:PERSON_NAME_1}}.xml' })}
      />
    </PiiMaskProvider>,
  );
  expect(screen.getByTestId('create-file-name').textContent).toBe(
    'MüllerNordWest.xml',
  );
  download();
  expect(filenames).toEqual(['MüllerNordWest.xml']);
});

it.each(['a', '😀'])(
  'downloads a filename at the 200-character boundary (%s)',
  (character) => {
    const filename = character.repeat(200);
    render(<CreateFileWidget content={content({ ...params, filename })} />);
    download();
    expect(filenames).toEqual([`${filename}.xml`]);
  },
);

it('does not render an oversized historical filename', () => {
  const filename = 'a'.repeat(100000);
  render(<CreateFileWidget content={content({ ...params, filename })} />);
  expect(screen.getByTestId('create-file-name').textContent).not.toContain(
    filename,
  );
  expect(
    screen.getByTestId('create-file-download').hasAttribute('disabled'),
  ).toBe(true);
});

it('bounds filenames expanded by PII restoration', () => {
  render(
    <PiiMaskProvider
      masks={[
        {
          id: 'filename-mask',
          token: '{{pii:PERSON_NAME_1}}',
          value: 'M'.repeat(500),
          category: 'person_name',
          unmasked: false,
        },
      ]}
    >
      <CreateFileWidget
        content={content({ ...params, filename: '{{pii:PERSON_NAME_1}}' })}
      />
    </PiiMaskProvider>,
  );
  const expected = `${'M'.repeat(200)}.xml`;
  expect(screen.getByTestId('create-file-name').textContent).toBe(expected);
  download();
  expect(filenames).toEqual([expected]);
});
