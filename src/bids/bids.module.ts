import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BidsService } from './bids.service';
import { BidsController } from './bids.controller';
import { Bid } from '../database/entities/bid.entity';
import { Auction } from '../database/entities/auction.entity';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bid, Auction]),
    MessagingModule,
  ],
  controllers: [BidsController],
  providers: [BidsService],
  exports: [BidsService],
})
export class BidsModule {}