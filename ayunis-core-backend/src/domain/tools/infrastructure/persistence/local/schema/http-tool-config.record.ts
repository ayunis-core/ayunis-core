import { ChildEntity, Column } from 'typeorm';
import { ToolConfigRecord } from './tool-config.record';
import { ToolType } from '../../../../domain/value-objects/tool-type.enum';
import { HttpToolMethod } from '../../../../domain/tools/http-tool.entity';

@ChildEntity(ToolType.HTTP)
export class HttpToolConfigRecord extends ToolConfigRecord {
  @Column()
  endpointUrl: string;

  @Column()
  method: HttpToolMethod;

  @Column()
  description: string;
}
