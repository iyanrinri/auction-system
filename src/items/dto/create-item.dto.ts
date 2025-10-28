import { IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateItemDto {
  @ApiProperty({
    description: 'Title of the item',
    example: 'Vintage Rolex Watch',
  })
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the item',
    example: 'A beautiful vintage Rolex Submariner from 1970 in excellent condition.',
  })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the item (images, specifications, etc.)',
    example: {
      category: 'watches',
      brand: 'Rolex',
      model: 'Submariner',
      year: 1970,
      condition: 'excellent',
      images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}