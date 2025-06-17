import { Tool } from './tool.entity';

export abstract class ContextualTool extends Tool {
  abstract isAvailable(ctx: unknown): boolean;
}
