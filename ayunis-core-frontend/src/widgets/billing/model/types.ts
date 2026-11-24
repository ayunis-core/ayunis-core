import type {
  CreateSubscriptionRequestDto,
  CreateSubscriptionRequestDtoType,
} from '@ayunis/api-client';

// The API defaults the type server-side; the dialog always has one selected.
export type CreateSubscriptionFormData = CreateSubscriptionRequestDto & {
  type: CreateSubscriptionRequestDtoType;
};
