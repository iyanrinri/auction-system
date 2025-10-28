import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsPositive,
  Min,
  Max,
} from 'class-validator';

export class GetBidsQueryDto {
  @ApiProperty({
    description: 'Auction ID to filter bids',
    required: false,
    example: '1',
  })
  @IsOptional()
  @IsString()
  auctionId?: string;

  @ApiProperty({
    description: 'Bidder ID to filter bids',
    required: false,
    example: '2',
  })
  @IsOptional()
  @IsString()
  bidderId?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsPositive()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of bids per page',
    required: false,
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description: 'Sort field',
    required: false,
    enum: ['createdAt', 'amount'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'amount' = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    required: false,
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}