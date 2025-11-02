import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQService } from './rabbitmq.service';
import { AuctionStatusService } from './auction-status.service';
import { AuctionStatusController } from './auction-status.controller';
import { BidEventService } from './bid-event.service';
import { Auction } from '../database/entities/auction.entity';
import { Bid } from '../database/entities/bid.entity';
import { AuctionsModule } from '../auctions/auctions.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Auction, Bid]),
    forwardRef(() => AuctionsModule),
  ],
  controllers: [AuctionStatusController],
  providers: [
    RabbitMQService,
    AuctionStatusService,
    BidEventService,
  ],
  exports: [
    RabbitMQService,
    AuctionStatusService,
    BidEventService,
  ],
})
export class MessagingModule implements OnModuleInit {
  constructor(private bidEventService: BidEventService) {}

  async onModuleInit() {
    // Start consuming bid events when module initializes
    await this.bidEventService.startBidEventConsumer();
  }
}