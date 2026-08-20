import { RunInvalidInputError } from 'src/domain/runs/application/runs.errors';
import {
  RunToolResultInput,
  RunUserInput,
} from 'src/domain/runs/domain/run-input.entity';

export function parseRunInput(input: RunUserInput | RunToolResultInput): {
  userInput: RunUserInput | null;
  toolResultInput: RunToolResultInput | null;
} {
  const userInput = input instanceof RunUserInput ? input : null;
  const toolResultInput = input instanceof RunToolResultInput ? input : null;
  if (!userInput && !toolResultInput) {
    throw new RunInvalidInputError('Invalid input');
  }
  return { userInput, toolResultInput };
}
