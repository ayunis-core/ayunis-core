import { UUID } from 'crypto';
import { RunInput } from 'src/domain/runs/domain/run-input.entity';

export class ExecuteRunAndSetTitleCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly input: RunInput,
    public readonly userId: UUID,
    public readonly streaming?: boolean,
  ) {}
}
