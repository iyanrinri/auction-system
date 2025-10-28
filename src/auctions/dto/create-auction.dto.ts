import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateAuctionDto {
  @ApiProperty({
    description: 'ID of the item to be auctioned',
    example: '1',
  })
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({
    description: 'Starting price for the auction',
    example: 1000.00,
    minimum: 0,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  startingPrice: number;

  @ApiPropertyOptional({
    description: 'Reserve price (minimum price to sell)',
    example: 1500.00,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  reservePrice?: number;

  @ApiPropertyOptional({
    description: 'Buy now price (instant purchase)',
    example: 5000.00,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  buyNowPrice?: number;

  @ApiPropertyOptional({
    description: 'Minimum increment for bids',
    example: 50.00,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minIncrement?: number;

  @ApiProperty({
    description: 'Auction start time (ISO 8601 format)',
    example: '2025-10-28T10:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  startAt: string;

  @ApiProperty({
    description: 'Auction end time (ISO 8601 format)',
    example: '2025-10-29T10:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  endAt: string;

  @ApiPropertyOptional({
    description: 'Auto-extend seconds when bid placed near end',
    example: 300,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  autoExtendSeconds?: number;
}