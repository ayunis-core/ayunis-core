import { registerAs } from '@nestjs/config';

export default registerAs('subscriptions', () => ({
  pricePerSeatMonthly: process.env.SUBSCRIPTIONS_PRICE_PER_SEAT_MONTHLY,
  pricePerSeatYearly: process.env.SUBSCRIPTIONS_PRICE_PER_SEAT_YEARLY,
}));
