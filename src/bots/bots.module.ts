import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AutoBidderBotService } from './auto-bidder-bot.service';
import { BotsController } from './bots.controller';
import { User } from '../database/entities/user.entity';
import { Auction } from '../database/entities/auction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Auction]),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [BotsController],
  providers: [AutoBidderBotService],
  exports: [AutoBidderBotService],
})
export class BotsModule {}
