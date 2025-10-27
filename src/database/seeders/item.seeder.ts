import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Item } from '../entities/item.entity';
import { BaseSeeder } from './base.seeder';

@Injectable()
export class ItemSeeder extends BaseSeeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    const userRepository = this.dataSource.getRepository(User);
    const itemRepository = this.dataSource.getRepository(Item);

    // Find seller user
    const seller = await userRepository.findOne({
      where: { role: UserRole.SELLER },
    });

    if (!seller) {
      console.log('❌ No seller found. Please run user seeder first.');
      return;
    }

    const sampleItems = [
      {
        title: 'Vintage Watch Collection',
        description: 'A beautiful collection of vintage watches from the 1950s',
        metadata: {
          category: 'collectibles',
          condition: 'excellent',
          brand: 'Rolex',
          year: 1955,
          images: [
            'https://example.com/watch1.jpg',
            'https://example.com/watch2.jpg',
          ],
        },
      },
      {
        title: 'Antique Painting',
        description: 'Original oil painting from a renowned artist',
        metadata: {
          category: 'art',
          condition: 'very good',
          artist: 'Unknown Master',
          year: 1890,
          dimensions: '60x80cm',
          images: ['https://example.com/painting1.jpg'],
        },
      },
      {
        title: 'Classic Car Model',
        description: 'Die-cast model of a 1967 Ford Mustang',
        metadata: {
          category: 'toys',
          condition: 'mint',
          scale: '1:18',
          manufacturer: 'AutoArt',
          images: ['https://example.com/car-model1.jpg'],
        },
      },
      {
        title: 'Rare Book Collection',
        description: 'First edition books from famous authors',
        metadata: {
          category: 'books',
          condition: 'good',
          publisher: 'Various',
          language: 'English',
          count: 5,
          images: ['https://example.com/books1.jpg'],
        },
      },
      {
        title: 'Jewelry Set',
        description: 'Elegant diamond jewelry set with necklace and earrings',
        metadata: {
          category: 'jewelry',
          condition: 'excellent',
          material: 'gold',
          gemstone: 'diamond',
          weight: '25g',
          images: [
            'https://example.com/jewelry1.jpg',
            'https://example.com/jewelry2.jpg',
          ],
        },
      },
    ];

    for (const itemData of sampleItems) {
      const existingItem = await itemRepository.findOne({
        where: { title: itemData.title },
      });

      if (!existingItem) {
        const item = itemRepository.create({
          ...itemData,
          sellerId: seller.id,
        });

        await itemRepository.save(item);
        console.log(`✅ Item created: ${itemData.title}`);
      }
    }
  }
}