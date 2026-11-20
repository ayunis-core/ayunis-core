import {
  ARTIFACT_MAX_CONTENT_LENGTH,
  ArtifactContentTooLargeError,
  InvalidBpmnContentError,
} from 'src/domain/artifacts/application/artifacts.errors';
import { normalizeBpmnContent } from './bpmn-content-format';

const DEFINITIONS_OPEN =
  '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1" targetNamespace="http://ayunis.de/bpmn">';

function processXml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
${DEFINITIONS_OPEN}
  <bpmn:process id="Process_Leave" isExecutable="false">
${body}
  </bpmn:process>
</bpmn:definitions>`;
}

const LEAVE_REQUEST = processXml(`
    <bpmn:startEvent id="Start" name="Antrag gestellt" />
    <bpmn:userTask id="Task_Review" name="Antrag prüfen" />
    <bpmn:exclusiveGateway id="Gateway_Decision" name="Genehmigt?" />
    <bpmn:task id="Task_Record" name="Urlaub erfassen" />
    <bpmn:task id="Task_Reject" name="Ablehnung mitteilen" />
    <bpmn:endEvent id="End" name="Erledigt" />
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start" targetRef="Task_Review" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_Review" targetRef="Gateway_Decision" />
    <bpmn:sequenceFlow id="Flow_Yes" name="Ja" sourceRef="Gateway_Decision" targetRef="Task_Record" />
    <bpmn:sequenceFlow id="Flow_No" name="Nein" sourceRef="Gateway_Decision" targetRef="Task_Reject" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_Record" targetRef="End" />
    <bpmn:sequenceFlow id="Flow_4" sourceRef="Task_Reject" targetRef="End" />`);

function count(haystack: string, needle: RegExp): number {
  return [...haystack.matchAll(needle)].length;
}

function edgeElementIds(xml: string): string[] {
  return [...xml.matchAll(/<bpmndi:BPMNEdge[^>]*bpmnElement="([^"]+)"/g)]
    .map((m) => m[1])
    .sort((a, b) => a.localeCompare(b));
}

describe('normalizeBpmnContent', () => {
  it('lays out semantic-only BPMN so every flow node and flow can be rendered', async () => {
    const result = await normalizeBpmnContent(LEAVE_REQUEST);

    expect(count(result, /<bpmndi:BPMNShape /g)).toBe(6);
    expect(edgeElementIds(result)).toEqual([
      'Flow_1',
      'Flow_2',
      'Flow_3',
      'Flow_4',
      'Flow_No',
      'Flow_Yes',
    ]);
  });

  it('accepts BPMN that the model wrapped in a markdown code fence', async () => {
    const result = await normalizeBpmnContent(
      '```xml\n' + LEAVE_REQUEST + '\n```',
    );

    expect(count(result, /<bpmndi:BPMNShape /g)).toBe(6);
  });

  it('replaces an existing layout instead of adding a second diagram on update', async () => {
    const once = await normalizeBpmnContent(LEAVE_REQUEST);
    const twice = await normalizeBpmnContent(once);

    expect(count(twice, /<bpmndi:BPMNDiagram /g)).toBe(1);
    expect(count(twice, /<bpmndi:BPMNShape /g)).toBe(6);
  });

  it('draws one edge per flow when the model lists a flow on the wrong node', async () => {
    const inconsistent = processXml(`
      <bpmn:startEvent id="Start"><bpmn:outgoing>Flow_A</bpmn:outgoing></bpmn:startEvent>
      <bpmn:task id="Task_A"><bpmn:incoming>Flow_A</bpmn:incoming><bpmn:outgoing>Flow_End</bpmn:outgoing></bpmn:task>
      <bpmn:task id="Task_B"><bpmn:outgoing>Flow_End</bpmn:outgoing></bpmn:task>
      <bpmn:endEvent id="End"><bpmn:incoming>Flow_End</bpmn:incoming></bpmn:endEvent>
      <bpmn:sequenceFlow id="Flow_A" sourceRef="Start" targetRef="Task_A" />
      <bpmn:sequenceFlow id="Flow_B" sourceRef="Task_A" targetRef="Task_B" />
      <bpmn:sequenceFlow id="Flow_End" sourceRef="Task_B" targetRef="End" />`);

    const result = await normalizeBpmnContent(inconsistent);

    expect(edgeElementIds(result)).toEqual(['Flow_A', 'Flow_B', 'Flow_End']);
  });

  it('rejects element IDs the BPMN parser cannot read and names the offending ID', async () => {
    const umlautId = LEAVE_REQUEST.replaceAll('Task_Review', 'Task_Prüfen');

    const error = await normalizeBpmnContent(umlautId).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(InvalidBpmnContentError);
    expect((error as Error).message).toContain('Task_Prüfen');
  });

  it('rejects malformed XML', async () => {
    await expect(
      normalizeBpmnContent(`${DEFINITIONS_OPEN}<bpmn:process id="P">`),
    ).rejects.toBeInstanceOf(InvalidBpmnContentError);
  });

  it('rejects a sequence flow without a target', async () => {
    const dangling = processXml(`
      <bpmn:startEvent id="Start" />
      <bpmn:sequenceFlow id="Flow_1" sourceRef="Start" />`);

    await expect(normalizeBpmnContent(dangling)).rejects.toThrow('Flow_1');
  });

  it('rejects definitions without a process', async () => {
    await expect(
      normalizeBpmnContent(`${DEFINITIONS_OPEN}</bpmn:definitions>`),
    ).rejects.toBeInstanceOf(InvalidBpmnContentError);
  });

  it('rejects oversized content as too large before parsing or laying it out', async () => {
    const oversized = LEAVE_REQUEST.replace(
      '<bpmn:process',
      `<!-- ${'x'.repeat(ARTIFACT_MAX_CONTENT_LENGTH)} --><bpmn:process`,
    );

    await expect(normalizeBpmnContent(oversized)).rejects.toBeInstanceOf(
      ArtifactContentTooLargeError,
    );
  });
});
