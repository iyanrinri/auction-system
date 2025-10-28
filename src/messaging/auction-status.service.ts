import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Auction, AuctionStatus } from '../database/entities/auction.entity';
import { RabbitMQService } from '../messaging/rabbitmq.service';

@Injectable()
export class AuctionStatusService {
  private readonly logger = new Logger(AuctionStatusService.name);

  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    private rabbitMQService: RabbitMQService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async updateAuctionStatuses() {
    this.logger.debug('Running auction status update job...');
    
    try {
      await this.startScheduledAuctions();
      await this.endRunningAuctions();
      await this.notifyEndingSoonAuctions();
    } catch (error) {
      this.logger.error('Error in auction status update job:', error);
    }
  }

  private async startScheduledAuctions() {
    const now = new Date();
    
    // Find auctions that should start (scheduled status and startAt <= now)
    const auctionsToStart = await this.auctionRepository.find({
      where: {
        status: AuctionStatus.SCHEDULED,
        startAt: LessThanOrEqual(now),
      },
      relations: ['item', 'item.seller'],
    });

    if (auctionsToStart.length > 0) {
      this.logger.log(`Starting ${auctionsToStart.length} scheduled auctions`);

      for (const auction of auctionsToStart) {
        try {
          // Update status to running
          auction.status = AuctionStatus.RUNNING;
          auction.modifiedAt = now;
          await this.auctionRepository.save(auction);

          // Publish auction started event
          await this.rabbitMQService.publishMessage(
            'auction.exchange',
            'auction.started',
            {
              event: 'auction_started',
              auctionId: auction.id,
              itemId: auction.itemId,
              itemTitle: auction.item.title,
              sellerId: auction.item.sellerId,
              sellerName: auction.item.seller.name,
              startingPrice: parseFloat(auction.startingPrice.toString()),
              reservePrice: auction.reservePrice ? parseFloat(auction.reservePrice.toString()) : null,
              endAt: auction.endAt,
              timestamp: now.toISOString(),
            }
          );

          this.logger.log(`Auction ${auction.id} started successfully`);
        } catch (error) {
          this.logger.error(`Failed to start auction ${auction.id}:`, error);
        }
      }
    }
  }

  private async endRunningAuctions() {
    const now = new Date();
    
    // Find auctions that should end (running status and endAt <= now)
    const auctionsToEnd = await this.auctionRepository.find({
      where: {
        status: AuctionStatus.RUNNING,
        endAt: LessThanOrEqual(now),
      },
      relations: ['item', 'item.seller', 'bids', 'bids.bidder'],
    });

    if (auctionsToEnd.length > 0) {
      this.logger.log(`Ending ${auctionsToEnd.length} running auctions`);

      for (const auction of auctionsToEnd) {
        try {
          // Update status to ended
          auction.status = AuctionStatus.ENDED;
          auction.modifiedAt = now;
          await this.auctionRepository.save(auction);

          // Find highest bid
          const highestBid = auction.bids && auction.bids.length > 0 
            ? auction.bids.reduce((highest, current) => 
                parseFloat(current.amount.toString()) > parseFloat(highest.amount.toString()) 
                  ? current 
                  : highest
              )
            : null;

          // Check if reserve price was met
          const reservePriceMet = !auction.reservePrice || 
            (highestBid && parseFloat(highestBid.amount.toString()) >= parseFloat(auction.reservePrice.toString()));

          // Publish auction ended event
          await this.rabbitMQService.publishMessage(
            'auction.exchange',
            'auction.ended',
            {
              event: 'auction_ended',
              auctionId: auction.id,
              itemId: auction.itemId,
              itemTitle: auction.item.title,
              sellerId: auction.item.sellerId,
              sellerName: auction.item.seller.name,
              startingPrice: parseFloat(auction.startingPrice.toString()),
              reservePrice: auction.reservePrice ? parseFloat(auction.reservePrice.toString()) : null,
              reservePriceMet,
              winner: highestBid ? {
                bidderId: highestBid.bidderId,
                bidderName: highestBid.bidder.name,
                bidderEmail: highestBid.bidder.email,
                winningAmount: parseFloat(highestBid.amount.toString()),
              } : null,
              totalBids: auction.bids ? auction.bids.length : 0,
              timestamp: now.toISOString(),
            }
          );

          this.logger.log(`Auction ${auction.id} ended successfully`);
        } catch (error) {
          this.logger.error(`Failed to end auction ${auction.id}:`, error);
        }
      }
    }
  }

  private async notifyEndingSoonAuctions() {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    
    // Find running auctions ending in the next 5 minutes
    const endingSoonAuctions = await this.auctionRepository
      .createQueryBuilder('auction')
      .leftJoinAndSelect('auction.item', 'item')
      .leftJoinAndSelect('auction.bids', 'bids')
      .where('auction.status = :status', { status: AuctionStatus.RUNNING })
      .andWhere('auction.endAt > :now', { now })
      .andWhere('auction.endAt <= :fiveMinutes', { fiveMinutes: fiveMinutesFromNow })
      .getMany();

    for (const auction of endingSoonAuctions) {
      try {
        const timeRemaining = Math.floor((auction.endAt.getTime() - now.getTime()) / 1000 / 60); // minutes
        const highestBid = auction.bids && auction.bids.length > 0 
          ? auction.bids.reduce((highest, current) => 
              parseFloat(current.amount.toString()) > parseFloat(highest.amount.toString()) 
                ? current 
                : highest
            )
          : null;

        // Only send notification once per minute (to avoid spam)
        if (timeRemaining === 5 || timeRemaining === 2 || timeRemaining === 1) {
          await this.rabbitMQService.publishMessage(
            'auction.exchange',
            'auction.ending.soon',
            {
              event: 'auction_ending_soon',
              auctionId: auction.id,
              itemId: auction.itemId,
              itemTitle: auction.item.title,
              timeRemainingMinutes: timeRemaining,
              currentHighestBid: highestBid ? parseFloat(highestBid.amount.toString()) : null,
              totalBids: auction.bids ? auction.bids.length : 0,
              timestamp: now.toISOString(),
            }
          );

          this.logger.log(`Sent ending soon notification for auction ${auction.id} (${timeRemaining} minutes remaining)`);
        }
      } catch (error) {
        this.logger.error(`Failed to send ending soon notification for auction ${auction.id}:`, error);
      }
    }
  }

  async manuallyUpdateAuctionStatus(auctionId: string) {
    try {
      const auction = await this.auctionRepository.findOne({
        where: { id: auctionId },
        relations: ['item', 'item.seller', 'bids', 'bids.bidder'],
      });

      if (!auction) {
        throw new Error(`Auction ${auctionId} not found`);
      }

      const now = new Date();

      // Determine what status the auction should be
      if (auction.startAt > now) {
        auction.status = AuctionStatus.SCHEDULED;
      } else if (auction.endAt > now) {
        auction.status = AuctionStatus.RUNNING;
      } else {
        auction.status = AuctionStatus.ENDED;
      }

      auction.modifiedAt = now;
      await this.auctionRepository.save(auction);

      this.logger.log(`Manually updated auction ${auctionId} status to ${auction.status}`);
      return auction;
    } catch (error) {
      this.logger.error(`Failed to manually update auction ${auctionId} status:`, error);
      throw error;
    }
  }

  async getAuctionStatusStats() {
    const stats = await this.auctionRepository
      .createQueryBuilder('auction')
      .select('auction.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('auction.status')
      .getRawMany();

    return stats.reduce((acc, stat) => {
      acc[stat.status] = parseInt(stat.count);
      return acc;
    }, {});
  }
}