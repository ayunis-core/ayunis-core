declare module 'bpmn-moddle' {
  export interface BpmnElement {
    readonly $type: string;
    id?: string;
    name?: string;
  }

  export interface BpmnFlowNode extends BpmnElement {
    incoming?: BpmnSequenceFlow[];
    outgoing?: BpmnSequenceFlow[];
  }

  export interface BpmnSequenceFlow extends BpmnElement {
    sourceRef?: BpmnFlowNode;
    targetRef?: BpmnFlowNode;
  }

  export interface BpmnFlowElementsContainer extends BpmnElement {
    flowElements?: BpmnElement[];
  }

  export interface BpmnDefinitions extends BpmnElement {
    rootElements?: BpmnElement[];
    diagrams?: BpmnElement[];
  }

  export interface BpmnParseWarning {
    message: string;
  }

  export class BpmnModdle {
    fromXML(
      xml: string,
    ): Promise<{ rootElement: BpmnDefinitions; warnings: BpmnParseWarning[] }>;
    toXML(
      element: BpmnElement,
      options?: { format?: boolean },
    ): Promise<{ xml: string }>;
  }
}

declare module 'bpmn-auto-layout' {
  export function layoutProcess(xml: string): Promise<string>;
}
