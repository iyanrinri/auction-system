import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuctionStatus } from '../../database/entities/auction.entity';

export class AuctionResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '1' })
  itemId: string;

  @ApiProperty({ example: 1000.00 })
  startingPrice: number;

  @ApiPropertyOptional({ example: 1500.00 })
  reservePrice?: number;

  @ApiPropertyOptional({ example: 5000.00 })
  buyNowPrice?: number;

  @ApiProperty({ example: 50.00 })
  minIncrement: number;

  @ApiProperty({ example: '2025-10-28T10:00:00.000Z' })
  startAt: Date;

  @ApiProperty({ example: '2025-10-29T10:00:00.000Z' })
  endAt: Date;

  @ApiProperty({ enum: AuctionStatus, example: AuctionStatus.RUNNING })
  status: AuctionStatus;

  @ApiProperty({ example: 300 })
  autoExtendSeconds: number;

  @ApiProperty({ example: '2025-10-28T01:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-10-28T01:00:00.000Z' })
  modifiedAt: Date;

  @ApiProperty({
    description: 'Item information',
    example: {
      id: '1',
      title: 'Vintage Rolex Watch',
      description: 'A beautiful vintage watch',
      sellerId: '1',
      seller: {
        id: '1',
        email: 'seller@auction.com',
        name: 'John Seller',
        role: 'seller'
      }
    }
  })
  item: {
    id: string;
    title: string;
    description?: string;
    sellerId: string;
    metadata?: Record<string, any>;
    seller: {
      id: string;
      email: string;
      name?: string;
      role: string;
    };
  };

  @ApiPropertyOptional({
    description: 'Current highest bid information',
    example: {
      id: '1',
      amount: 1250.00,
      bidderId: '2',
      bidder: {
        id: '2',
        email: 'bidder@auction.com',
        name: 'Jane Bidder'
      },
      createdAt: '2025-10-28T12:00:00.000Z'
    }
  })
  currentHighestBid?: {
    id: string;
    amount: number;
    bidderId: string;
    bidder: {
      id: string;
      email: string;
      name?: string;
    };
    createdAt: Date;
  };

  @ApiProperty({
    description: 'Number of bids placed',
    example: 5
  })
  bidCount: number;

  @ApiPropertyOptional({
    description: 'Time remaining in milliseconds (null if ended)',
    example: 86400000
  })
  timeRemaining?: number;

  @ApiProperty({
    description: 'Whether reserve price has been met',
    example: false
  })
  reservePriceMet: boolean;
}

export class PaginatedAuctionsResponseDto {
  @ApiProperty({ type: [AuctionResponseDto] })
  auctions: AuctionResponseDto[];

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}