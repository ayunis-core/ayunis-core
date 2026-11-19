import { layoutProcess } from 'bpmn-auto-layout';
import {
  BpmnModdle,
  type BpmnDefinitions,
  type BpmnElement,
  type BpmnFlowElementsContainer,
  type BpmnFlowNode,
  type BpmnSequenceFlow,
} from 'bpmn-moddle';
import {
  ARTIFACT_MAX_CONTENT_LENGTH,
  ArtifactContentTooLargeError,
  InvalidBpmnContentError,
} from 'src/domain/artifacts/application/artifacts.errors';

const CODE_FENCE = '```';
const MAX_REPORTED_WARNINGS = 5;

/**
 * Turns model-written BPMN 2.0 XML into a renderable diagram. Models write the
 * semantic process well but cannot produce usable coordinates, so any layout
 * they send is discarded and recomputed. Incoming/outgoing references are
 * rebuilt from the sequence flows because models often list them
 * inconsistently, which makes the layouter draw duplicate edges.
 */
export async function normalizeBpmnContent(content: string): Promise<string> {
  // Parsing and layout are expensive, so oversized input is rejected first.
  if (content.length > ARTIFACT_MAX_CONTENT_LENGTH) {
    throw new ArtifactContentTooLargeError(
      content.length,
      ARTIFACT_MAX_CONTENT_LENGTH,
    );
  }
  const moddle = new BpmnModdle();
  const definitions = await parseDefinitions(moddle, stripCodeFence(content));

  const processes = (definitions.rootElements ?? []).filter(
    (element) => element.$type === 'bpmn:Process',
  );
  if (processes.length === 0) {
    throw new InvalidBpmnContentError(
      'the definitions contain no bpmn:process',
    );
  }

  relinkSequenceFlows(processes.flatMap(collectFlowElements));
  definitions.diagrams = [];

  const { xml } = await moddle.toXML(definitions);
  return await applyLayout(xml);
}

function stripCodeFence(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith(CODE_FENCE) || !trimmed.endsWith(CODE_FENCE)) {
    return trimmed;
  }
  const firstLineEnd = trimmed.indexOf('\n');
  if (firstLineEnd === -1) {
    return trimmed;
  }
  return trimmed.slice(firstLineEnd + 1, -CODE_FENCE.length).trim();
}

async function parseDefinitions(
  moddle: BpmnModdle,
  xml: string,
): Promise<BpmnDefinitions> {
  let parsed: Awaited<ReturnType<BpmnModdle['fromXML']>>;
  try {
    parsed = await moddle.fromXML(xml);
  } catch (error) {
    throw new InvalidBpmnContentError(describeError(error));
  }

  if (parsed.warnings.length > 0) {
    const reported = parsed.warnings
      .slice(0, MAX_REPORTED_WARNINGS)
      .map((warning) => collapseWhitespace(warning.message));
    throw new InvalidBpmnContentError(reported.join('; '));
  }
  return parsed.rootElement;
}

function collectFlowElements(container: BpmnElement): BpmnElement[] {
  const elements = (container as BpmnFlowElementsContainer).flowElements ?? [];
  return elements.flatMap((element) => [
    element,
    ...collectFlowElements(element),
  ]);
}

function isSequenceFlow(element: BpmnElement): element is BpmnSequenceFlow {
  return element.$type === 'bpmn:SequenceFlow';
}

function relinkSequenceFlows(elements: BpmnElement[]): void {
  for (const node of elements.filter((e) => !isSequenceFlow(e))) {
    const flowNode = node as BpmnFlowNode;
    flowNode.incoming = [];
    flowNode.outgoing = [];
  }

  for (const flow of elements.filter(isSequenceFlow)) {
    const { sourceRef, targetRef } = flow;
    if (!sourceRef || !targetRef) {
      throw new InvalidBpmnContentError(
        `sequence flow "${flow.id}" needs both a sourceRef and a targetRef`,
      );
    }
    sourceRef.outgoing = [...(sourceRef.outgoing ?? []), flow];
    targetRef.incoming = [...(targetRef.incoming ?? []), flow];
  }
}

async function applyLayout(xml: string): Promise<string> {
  try {
    return await layoutProcess(xml);
  } catch (error) {
    throw new InvalidBpmnContentError(
      `the process could not be laid out (${describeError(error)})`,
    );
  }
}

function describeError(error: unknown): string {
  return collapseWhitespace(
    error instanceof Error ? error.message : String(error),
  );
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
