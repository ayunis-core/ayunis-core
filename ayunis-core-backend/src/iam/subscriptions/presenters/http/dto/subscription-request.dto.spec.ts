import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSubscriptionRequestDto } from './create-subscription-request.dto';
import { ChangeSubscriptionRequestDto } from './change-subscription-request.dto';
const billing = {
  companyName: 'Musterstadt',
  street: 'Hauptstrasse',
  houseNumber: '1',
  postalCode: '12345',
  city: 'Musterstadt',
  country: 'DE',
  type: 'USAGE_BASED',
  monthlyCredits: 1000,
};
describe('subscription request expiry contract', () => {
  it('rejects an impossible calendar end rather than normalizing it', async () => {
    const dto = plainToInstance(CreateSubscriptionRequestDto, {
      ...billing,
      accessEndsAt: '2027-02-30T00:00:00Z',
    });
    const errors = await validate(dto);
    expect(errors.some(({ property }) => property === 'accessEndsAt')).toBe(
      true,
    );
  });
  it('does not add the create-only end to replacement requests', async () => {
    const dto = plainToInstance(ChangeSubscriptionRequestDto, {
      ...billing,
      accessEndsAt: '2027-02-01T00:00:00Z',
      oldSubscriptionDisposition: 'CANCEL',
    });
    expect(await validate(dto, { whitelist: true })).toEqual([]);
    expect('accessEndsAt' in dto).toBe(false);
  });
});
