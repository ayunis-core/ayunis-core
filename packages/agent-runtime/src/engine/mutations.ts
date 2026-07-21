import type { Message } from '../contracts/message';
import type { Tool } from '../contracts/tool';

type MessageTransform = (messages: readonly Message[]) => Message[];

type ToolOp =
  | { kind: 'add'; tools: Tool[] }
  | { kind: 'remove'; names: string[] }
  | { kind: 'set'; tools: Tool[] };

export interface MutableRunConfig {
  messages: Message[];
  tools: Tool[];
  instructions: string;
}

/**
 * Buffers hook mutations between request assemblies. Drained (in arrival
 * order per kind) when the loop assembles the next provider request.
 */
export class PendingMutations {
  private messageTransforms: MessageTransform[] = [];
  private toolOps: ToolOp[] = [];
  private instructionsOverride: string | undefined;
  private instructionAdditions: string[] = [];

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

  setInstructions(instructions: string): void {
    this.instructionsOverride = instructions;
  }

  addInstructions(text: string): void {
    this.instructionAdditions.push(text);
  }

  apply(config: MutableRunConfig): MutableRunConfig {
    let messages = config.messages;
    for (const transform of this.messageTransforms) {
      messages = transform(messages);
    }
    let tools = config.tools;
    for (const op of this.toolOps) {
      tools = applyToolOp(tools, op);
    }
    let instructions = this.instructionsOverride ?? config.instructions;
    for (const addition of this.instructionAdditions) {
      instructions = instructions ? `${instructions}\n\n${addition}` : addition;
    }
    this.messageTransforms = [];
    this.toolOps = [];
    this.instructionsOverride = undefined;
    this.instructionAdditions = [];
    return { messages, tools, instructions };
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
  }
};
