import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuctionsService } from './auctions.service';
import { AuctionsController } from './auctions.controller';
import { AuctionsGateway } from './auctions.gateway';
import { Auction } from '../database/entities/auction.entity';
import { Item } from '../database/entities/item.entity';
import { Bid } from '../database/entities/bid.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction, Item, Bid]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d',
        } as any,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuctionsController],
  providers: [AuctionsService, AuctionsGateway],
  exports: [AuctionsService, AuctionsGateway],
})
export class AuctionsModule {}