import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserSeeder } from './user.seeder';
import { ItemSeeder } from './item.seeder';

@Injectable()
export class SeederService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly userSeeder: UserSeeder,
    private readonly itemSeeder: ItemSeeder,
  ) {}

  async runAllSeeders(): Promise<void> {
    console.log('🌱 Starting database seeding...');

    try {
      // Run seeders in order
      await this.userSeeder.run();
      await this.itemSeeder.run();

      console.log('🎉 Database seeding completed successfully!');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }
}