import type {
  CreateSubscriptionRequestDto,
  CreateSubscriptionRequestDtoType,
} from '@/shared/api';

// The API defaults the type server-side; the dialog always has one selected.
export type CreateSubscriptionFormData = CreateSubscriptionRequestDto & {
  type: CreateSubscriptionRequestDtoType;
};
