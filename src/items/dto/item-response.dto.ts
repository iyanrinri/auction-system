import { ApiProperty } from '@nestjs/swagger';

export class ItemResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '1' })
  sellerId: string;

  @ApiProperty({ example: 'Vintage Rolex Watch' })
  title: string;

  @ApiProperty({ 
    example: 'A beautiful vintage Rolex Submariner from 1970 in excellent condition.',
    nullable: true 
  })
  description?: string;

  @ApiProperty({ 
    example: {
      category: 'watches',
      brand: 'Rolex',
      model: 'Submariner',
      year: 1970,
      condition: 'excellent',
      images: ['https://example.com/image1.jpg']
    },
    nullable: true 
  })
  metadata?: Record<string, any>;

  @ApiProperty({ example: '2025-10-28T01:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-10-28T01:00:00.000Z' })
  modifiedAt: Date;

  @ApiProperty({ 
    description: 'Seller information',
    example: {
      id: '1',
      email: 'seller@auction.com',
      name: 'John Seller',
      role: 'seller'
    }
  })
  seller?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };

  @ApiProperty({ 
    description: 'Associated auction information',
    nullable: true,
    example: {
      id: '1',
      startingPrice: 1000,
      status: 'running',
      startAt: '2025-10-28T01:00:00.000Z',
      endAt: '2025-10-28T23:00:00.000Z'
    }
  })
  auction?: {
    id: string;
    startingPrice: number;
    status: string;
    startAt: Date;
    endAt: Date;
  };
}

export class PaginatedItemsResponseDto {
  @ApiProperty({ type: [ItemResponseDto] })
  items: ItemResponseDto[];

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}