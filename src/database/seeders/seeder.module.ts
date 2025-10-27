import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database.module';
import { SeederService } from './seeder.service';
import { UserSeeder } from './user.seeder';
import { ItemSeeder } from './item.seeder';

@Module({
  imports: [DatabaseModule],
  providers: [SeederService, UserSeeder, ItemSeeder],
  exports: [SeederService],
})
export class SeederModule {}