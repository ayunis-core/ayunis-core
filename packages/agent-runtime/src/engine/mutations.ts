import type { Message } from '../contracts/message';
import type { Tool } from '../contracts/tool';

type MessageTransform = (messages: readonly Message[]) => Message[];

type ToolOp =
  | { kind: 'add'; tools: Tool[] }
  | { kind: 'remove'; names: string[] }
  | { kind: 'set'; tools: Tool[] }
  | { kind: 'transform'; fn: (tools: readonly Tool[]) => Tool[] };

type InstructionOp =
  | { kind: 'add'; text: string }
  | { kind: 'set'; text: string }
  | { kind: 'transform'; fn: (instructions: string) => string };

export interface MutableRunConfig {
  messages: Message[];
  tools: Tool[];
  instructions: string;
}

interface ToolPreview {
  readonly base: Tool[];
  appliedOps: number;
  tools: Tool[];
  projecting: boolean;
}

/**
 * Buffers hook mutations between request assemblies. Drained (in arrival
 * order per kind) when the loop assembles the next provider request.
 */
export class PendingMutations {
  private messageTransforms: MessageTransform[] = [];
  private toolOps: ToolOp[] = [];
  private instructionOps: InstructionOp[] = [];
  private toolPreview?: ToolPreview;

  transformMessages(fn: MessageTransform): void {
    this.messageTransforms.push(fn);
  }

  addTools(...tools: Tool[]): void {
    this.toolOps.push({ kind: 'add', tools });
  }

  removeTools(...names: string[]): void {
    this.toolOps.push({ kind: 'remove', names });
  }

  setTools(tools: Tool[]): void {
    this.toolOps.push({ kind: 'set', tools });
  }

  transformTools(fn: (tools: readonly Tool[]) => Tool[]): void {
    this.toolOps.push({ kind: 'transform', fn });
  }

  getProspectiveTools(base: Tool[]): readonly Tool[] {
    const preview = this.prepareToolPreview(base);
    if (!preview.projecting) {
      preview.projecting = true;
      try {
        while (preview.appliedOps < this.toolOps.length) {
          preview.tools = applyToolOp(
            preview.tools,
            this.toolOps[preview.appliedOps],
          );
          preview.appliedOps += 1;
        }
      } finally {
        preview.projecting = false;
      }
    }
    return Object.freeze([...preview.tools]);
  }

  addInstructions(text: string): void {
    this.instructionOps.push({ kind: 'add', text });
  }

  setInstructions(text: string): void {
    this.instructionOps.push({ kind: 'set', text });
  }

  transformInstructions(fn: (instructions: string) => string): void {
    this.instructionOps.push({ kind: 'transform', fn });
  }

  apply(config: MutableRunConfig): MutableRunConfig {
    let messages = config.messages;
    for (const transform of this.messageTransforms) {
      messages = transform(messages);
    }
    const tools = [...this.getProspectiveTools(config.tools)];
    let instructions = config.instructions;
    for (const op of this.instructionOps) {
      instructions = applyInstructionOp(instructions, op);
    }
    this.messageTransforms = [];
    this.toolOps = [];
    this.instructionOps = [];
    this.toolPreview = undefined;
    return { messages, tools, instructions };
  }

  private prepareToolPreview(base: Tool[]): ToolPreview {
    if (this.toolPreview?.base !== base) {
      this.toolPreview = {
        base,
        appliedOps: 0,
        tools: [...base],
        projecting: false,
      };
    }
    return this.toolPreview;
  }
}

const applyToolOp = (tools: Tool[], op: ToolOp): Tool[] => {
  switch (op.kind) {
    case 'add': {
      // Adding a tool with an existing name replaces it.
      const added = new Set(op.tools.map((tool) => tool.name));
      return [...tools.filter((tool) => !added.has(tool.name)), ...op.tools];
    }
    case 'remove': {
      const removed = new Set(op.names);
      return tools.filter((tool) => !removed.has(tool.name));
    }
    case 'set':
      return [...op.tools];
    case 'transform':
      return [...op.fn([...tools])];
  }
};

const applyInstructionOp = (
  instructions: string,
  op: InstructionOp,
): string => {
  switch (op.kind) {
    case 'set':
      return op.text;
    case 'add':
      return instructions ? `${instructions}\n\n${op.text}` : op.text;
    case 'transform':
      return op.fn(instructions);
  }
};
