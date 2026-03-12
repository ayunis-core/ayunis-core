export interface PlatformConfigParams {
  key: string;
  value: string;
}

export class PlatformConfig {
  public readonly key: string;
  public readonly value: string;

  constructor(params: PlatformConfigParams) {
    this.key = params.key;
    this.value = params.value;
  }
}
