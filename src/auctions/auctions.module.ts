import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionsService } from './auctions.service';
import { AuctionsController } from './auctions.controller';
import { Auction } from '../database/entities/auction.entity';
import { Item } from '../database/entities/item.entity';
import { Bid } from '../database/entities/bid.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Auction, Item, Bid])],
  controllers: [AuctionsController],
  providers: [AuctionsService],
  exports: [AuctionsService],
})
export class AuctionsModule {}