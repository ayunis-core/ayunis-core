interface Node {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
}

interface UrlReference {
  marker: string;
  url: string;
  hostname: string;
}

export function protectUrlReferences(source: string) {
  const references = new Map<string, UrlReference>();
  if (!source.includes('{{url:')) return { markdown: source, references };
  let prefix = `AYUNISURLREFERENCE${crypto.randomUUID().replaceAll('-', '')}TOKEN`;
  while (source.includes(prefix)) prefix += 'X';
  const markdown = source.replace(
    /(?<!\{)\{\{url:([^\s{}]+)\}\}(?!\})/g,
    (marker: string, url: string) => {
      const hostname = getHostname(url);
      if (!hostname) return marker;
      const token = `${prefix}${references.size}END`;
      references.set(token, { marker, url, hostname });
      return token;
    },
  );
  return { markdown, references };
}

function getHostname(value: string): string | null {
  if (!/^https?:\/\//i.test(value) || value.includes('\\')) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function rehypeUrlReferences(options: {
  references: ReadonlyMap<string, UrlReference>;
}) {
  const entries = [...options.references];
  return (tree: Node): void => visit(tree, entries, false);
}

type ReferenceEntry = [string, UrlReference];

function visit(node: Node, entries: ReferenceEntry[], excluded: boolean): void {
  const literal = excluded || ['code', 'pre', 'a'].includes(node.tagName ?? '');
  restoreProperties(node, entries);
  if (!node.children) return;
  node.children = node.children.flatMap((child) => {
    if (child.type === 'text')
      return replaceText(child.value ?? '', entries, literal);
    visit(child, entries, literal);
    return [child];
  });
}

function replaceText(
  value: string,
  entries: ReferenceEntry[],
  literal: boolean,
): Node[] {
  let nodes: Node[] = [{ type: 'text', value }];
  for (const [token, reference] of entries) {
    nodes = nodes.flatMap((node) => {
      if (node.type !== 'text') return [node];
      const parts = node.value!.split(token);
      return parts.flatMap((part, index) => {
        const text: Node = { type: 'text', value: part };
        if (index === 0) return [text];
        return [
          literal
            ? { type: 'text', value: reference.marker }
            : createReference(reference),
          text,
        ];
      });
    });
  }
  return nodes;
}

function restoreProperties(node: Node, entries: ReferenceEntry[]): void {
  if (!node.properties) return;
  for (const [key, value] of Object.entries(node.properties)) {
    node.properties[key] = Array.isArray(value)
      ? value.map((item: unknown) => restoreValue(item, entries))
      : restoreValue(value, entries);
  }
}

function restoreValue(value: unknown, entries: ReferenceEntry[]): unknown {
  if (typeof value !== 'string') return value;
  return entries.reduce(
    (text, [token, reference]) => text.replaceAll(token, reference.marker),
    value,
  );
}

function createReference(reference: UrlReference): Node {
  return {
    type: 'element',
    tagName: 'a',
    properties: {
      href: reference.url,
      title: reference.url,
      'data-url-reference': 'true',
    },
    children: [{ type: 'text', value: reference.hostname }],
  };
}
