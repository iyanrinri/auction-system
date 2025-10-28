import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsPositive,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateBidDto {
  @ApiProperty({
    description: 'ID of the auction to bid on',
    example: '1',
  })
  @IsString()
  @IsNotEmpty()
  auctionId: string;

  @ApiProperty({
    description: 'Bid amount in dollars',
    example: 1550.00,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Whether this is an auto-bid (for future auto-bidding feature)',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAuto?: boolean = false;
}