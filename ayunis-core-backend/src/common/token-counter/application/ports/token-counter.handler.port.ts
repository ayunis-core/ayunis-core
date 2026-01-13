export enum TokenCounterType {
  TIKTOKEN = 'tiktoken',
  SIMPLE = 'simple',
}

export abstract class TokenCounterHandler {
  abstract readonly type: TokenCounterType;
  abstract isAvailable(): boolean;
  abstract countTokens(text: string): number;
}
