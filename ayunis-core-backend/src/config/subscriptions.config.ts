import { registerAs } from '@nestjs/config';

export const subscriptionsConfig = registerAs('subscriptions', () => ({
  pricePerSeatMonthly: Number(process.env.SUBSCRIPTIONS_PRICE_PER_SEAT_MONTHLY),
  pricePerSeatYearly: Number(process.env.SUBSCRIPTIONS_PRICE_PER_SEAT_YEARLY),
  trialMaxMessages: Number(process.env.TRIAL_MAX_MESSAGES) || 50,
}));
