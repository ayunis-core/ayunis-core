import type { AddonType } from './value-objects/addon-type.enum';

export interface AddonStatus {
  type: AddonType;
  active: boolean;
}
