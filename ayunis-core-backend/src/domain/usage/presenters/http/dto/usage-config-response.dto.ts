import { ApiProperty } from '@nestjs/swagger';

export class UsageConfigResponseDto {
  @ApiProperty({
    description:
      'Whether the deployment is self-hosted. Determines feature availability.',
    example: true,
  })
  isSelfHosted: boolean;

  @ApiProperty({
    description:
      'Whether cost information should be displayed in the UI. True for self-hosted, false for cloud deployments.',
    example: true,
  })
  showCostInformation: boolean;

  @ApiProperty({
    description: 'Default currency code used for cost calculations and display',
    example: 'USD',
  })
  defaultCurrency: string;

  @ApiProperty({
    description: 'Number of decimal places to use when formatting cost values',
    example: 6,
  })
  costDecimalPlaces: number;
}
