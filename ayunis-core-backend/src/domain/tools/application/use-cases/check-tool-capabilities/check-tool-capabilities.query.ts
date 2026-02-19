import type { Tool } from '../../../domain/tool.entity';

export class CheckToolCapabilitiesQuery {
  constructor(public readonly tool: Tool) {}
}
