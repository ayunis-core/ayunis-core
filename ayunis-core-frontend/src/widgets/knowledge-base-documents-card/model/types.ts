import type {
  ReindexIntervalDto,
  ReindexIntervalUnit,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export interface ReindexIntervalFormFields {
  enabled: boolean;
  value: number;
  unit: ReindexIntervalUnit;
}

export interface AddUrlFormFields {
  url: string;
  maxDepth: number;
  reindexInterval: ReindexIntervalFormFields;
}

export interface ReindexScheduleFormFields {
  reindexInterval: ReindexIntervalFormFields;
}

export interface AddUrlInput {
  url: string;
  maxDepth: number;
  reindexInterval: ReindexIntervalDto | null;
}
