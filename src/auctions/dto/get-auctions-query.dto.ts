import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuctionStatus } from '../../database/entities/auction.entity';

export class GetAuctionsQueryDto {
  @ApiPropertyOptional({
    description: 'Search query for auction item title or description',
    example: 'vintage watch',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Filter by auction status',
    enum: AuctionStatus,
    example: AuctionStatus.RUNNING,
  })
  @IsOptional()
  @IsIn(Object.values(AuctionStatus))
  status?: AuctionStatus;

  @ApiPropertyOptional({
    description: 'Filter by seller ID',
    example: '1',
  })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum price',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum price',
    example: 5000,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of auctions per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'endAt',
    enum: ['createdAt', 'startAt', 'endAt', 'startingPrice'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'endAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'ASC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}