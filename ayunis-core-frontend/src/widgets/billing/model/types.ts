export interface CreateSubscriptionFormData {
  companyName: string;
  subText?: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  vatNumber?: string;
  type: 'SEAT_BASED' | 'USAGE_BASED';
  noOfSeats?: number;
  monthlyCredits?: number;
  startsAt?: string;
  accessEndsAt?: string;
}
