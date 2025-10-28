import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';

export class BidResponseDto {
  @ApiProperty({
    description: 'Bid ID',
    example: '1',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Auction ID',
    example: '1',
  })
  @Expose()
  auctionId: string;

  @ApiProperty({
    description: 'Bidder ID',
    example: '2',
  })
  @Expose()
  bidderId: string;

  @ApiProperty({
    description: 'Bid amount',
    example: 1550.00,
  })
  @Expose()
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiProperty({
    description: 'Whether this is an auto-bid',
    example: false,
  })
  @Expose()
  isAuto: boolean;

  @ApiProperty({
    description: 'Bid creation timestamp',
    example: '2025-10-28T02:30:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Bid modification timestamp',
    example: '2025-10-28T02:30:00.000Z',
  })
  @Expose()
  modifiedAt: Date;

  @ApiProperty({
    description: 'Auction details',
    required: false,
  })
  @Expose()
  @Type(() => Object)
  auction?: {
    id: string;
    status: string;
    item: {
      id: string;
      title: string;
      description: string;
    };
  };

  @ApiProperty({
    description: 'Bidder details',
    required: false,
  })
  @Expose()
  @Type(() => Object)
  bidder?: {
    id: string;
    name: string;
    email: string;
  };
}

export class PaginatedBidsResponseDto {
  @ApiProperty({
    description: 'List of bids',
    type: [BidResponseDto],
  })
  @Expose()
  @Type(() => BidResponseDto)
  bids: BidResponseDto[];

  @ApiProperty({
    description: 'Total number of bids',
    example: 25,
  })
  @Expose()
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  @Expose()
  page: number;

  @ApiProperty({
    description: 'Number of bids per page',
    example: 10,
  })
  @Expose()
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  @Expose()
  totalPages: number;
}