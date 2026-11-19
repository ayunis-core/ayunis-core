const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>\n';
const LEADING_XML_DECLARATION = /^<\?xml [^?]*\?>\s*/;
const PNG_SCALE = 2;

/**
 * Applies `resolve` to every attribute value and text node of an XML document.
 * Working on the parsed DOM instead of the raw string keeps the output
 * well-formed when a resolved value contains characters like `&` or `<`.
 */
export function resolveXmlText(
  xml: string,
  resolve: (text: string) => string,
): string {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return xml;
  }

  const walker = doc.createTreeWalker(
    doc.documentElement,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  );
  for (let node: Node | null = walker.currentNode; node;) {
    resolveNode(node, resolve);
    node = walker.nextNode();
  }

  // Chrome keeps the source declaration when serializing, jsdom drops it.
  const serialized = new XMLSerializer()
    .serializeToString(doc)
    .replace(LEADING_XML_DECLARATION, '');
  return XML_DECLARATION + serialized;
}

function resolveNode(node: Node, resolve: (text: string) => string): void {
  if (node instanceof Element) {
    for (const attribute of Array.from(node.attributes)) {
      attribute.value = resolve(attribute.value);
    }
    return;
  }
  if (node.textContent) {
    node.textContent = resolve(node.textContent);
  }
}

export function svgToPngBlob(svg: string): Promise<Blob> {
  const svgElement = new DOMParser().parseFromString(
    svg,
    'image/svg+xml',
  ).documentElement;
  const width =
    Number.parseFloat(svgElement.getAttribute('width') ?? '') || 800;
  const height =
    Number.parseFloat(svgElement.getAttribute('height') ?? '') || 600;

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error('Failed to load SVG for export'));
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * PNG_SCALE));
      canvas.height = Math.max(1, Math.round(height * PNG_SCALE));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Canvas is not available'));
        return;
      }
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.scale(PNG_SCALE, PNG_SCALE);
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('PNG encoding failed'));
      }, 'image/png');
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}
