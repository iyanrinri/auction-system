import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQService } from './rabbitmq.service';
import { AuctionStatusService } from './auction-status.service';
import { AuctionStatusController } from './auction-status.controller';
import { BidEventService } from './bid-event.service';
import { Auction } from '../database/entities/auction.entity';
import { Bid } from '../database/entities/bid.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Auction, Bid]),
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