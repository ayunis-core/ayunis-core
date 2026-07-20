import type { Tool } from 'src/domain/tools/domain/tool.entity';

export class CheckToolCapabilitiesQuery {
  constructor(public readonly tool: Tool) {}
}
