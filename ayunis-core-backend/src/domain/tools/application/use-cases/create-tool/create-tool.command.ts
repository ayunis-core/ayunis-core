import { UUID } from 'crypto';
import { JSONSchema } from 'json-schema-to-ts';
import { ToolType } from '../../../domain/value-objects/tool-type.enum';
import { HttpToolMethod } from '../../../domain/tools/http-tool.entity';

export class CreateToolCommand {
  constructor(
    public readonly type: ToolType,
    public readonly userId: UUID,
    public readonly displayName: string,
    public readonly description: string,
    public readonly parameters: JSONSchema,
  ) {}
}

export class CreateHttpToolCommand extends CreateToolCommand {
  constructor(
    userId: UUID,
    displayName: string,
    description: string,
    public readonly endpointUrl: string,
    public readonly method: HttpToolMethod,
    parameters: JSONSchema,
  ) {
    super(ToolType.HTTP, userId, displayName, description, parameters);
  }
}
