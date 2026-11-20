import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveXmlText } from './bpmn-export';

const masks = new Map([
  ['{{pii:PERSON_NAME_1}}', 'Erika Mustermann'],
  ['{{pii:ORGANIZATION_1}}', 'Müller & Söhne <GmbH>'],
]);
const resolve = (text: string) =>
  text.replace(/\{\{pii:[A-Z0-9_]+\}\}/g, (token) => masks.get(token) ?? token);

const MASKED_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="D" targetNamespace="http://ayunis.de/bpmn">
  <bpmn:process id="P">
    <bpmn:userTask id="Task_1" name="{{pii:PERSON_NAME_1}} prüft Antrag">
      <bpmn:documentation>Rückfrage bei {{pii:ORGANIZATION_1}}</bpmn:documentation>
    </bpmn:userTask>
    <bpmn:sequenceFlow id="Flow_1" name="Firma {{pii:ORGANIZATION_1}}" sourceRef="Task_1" targetRef="Task_1" />
  </bpmn:process>
</bpmn:definitions>`;

function parse(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'application/xml');
}

describe('resolveXmlText', () => {
  it('restores masked values in attributes and text of the exported file', () => {
    const doc = parse(resolveXmlText(MASKED_BPMN, resolve));

    expect(doc.getElementById('Task_1')?.getAttribute('name')).toBe(
      'Erika Mustermann prüft Antrag',
    );
    expect(doc.getElementsByTagName('bpmn:documentation')[0].textContent).toBe(
      'Rückfrage bei Müller & Söhne <GmbH>',
    );
  });

  it('keeps the exported file well-formed when a restored value contains XML special characters', () => {
    const exported = resolveXmlText(MASKED_BPMN, resolve);

    expect(parse(exported).getElementsByTagName('parsererror')).toHaveLength(0);
    expect(parse(exported).getElementById('Flow_1')?.getAttribute('name')).toBe(
      'Firma Müller & Söhne <GmbH>',
    );
  });

  describe('when the browser serializer keeps the XML declaration', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('writes exactly one XML declaration so strict BPMN tools can open the file', () => {
      const serialize = XMLSerializer.prototype.serializeToString;
      vi.spyOn(XMLSerializer.prototype, 'serializeToString').mockImplementation(
        function (this: XMLSerializer, node: Node) {
          return `<?xml version="1.0" encoding="UTF-8"?>${serialize.call(this, node)}`;
        },
      );

      const exported = resolveXmlText(MASKED_BPMN, resolve);

      expect(exported.match(/<\?xml /g)).toHaveLength(1);
      expect(exported.startsWith('<?xml ')).toBe(true);
    });
  });
});
