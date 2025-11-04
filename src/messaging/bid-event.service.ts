import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { BidResponseDto } from '../bids/dto/bid-response.dto';

@Injectable()
export class BidEventService {
  private readonly logger = new Logger(BidEventService.name);

  constructor(private rabbitMQService: RabbitMQService) {}

  async publishBidPlaced(bid: BidResponseDto, auctionDetails: any) {
    try {
      const bidEvent = {
        event: 'bid_placed',
        bidId: bid.id,
        auctionId: bid.auctionId,
        bidderId: bid.bidderId,
        bidderName: bid.bidder?.name,
        amount: bid.amount,
        isAuto: bid.isAuto,
        itemTitle: auctionDetails.item?.title,
        sellerId: auctionDetails.item?.sellerId,
        timestamp: new Date().toISOString(),
      };

      // Send to specific bid notifications queue for processing
      await this.rabbitMQService.publishToQueue(
        'bid.notifications',
        bidEvent
      );

      this.logger.log(`📤 Published bid placed event for bid ${bid.id} on auction ${bid.auctionId}`);
    } catch (error) {
      this.logger.error('Failed to publish bid placed event:', error);
    }    
  }

  async publishHighestBidChanged(auctionId: string, newHighestBid: BidResponseDto, previousAmount?: number) {
    try {
      const event = {
        event: 'highest_bid_changed',
        auctionId,
        newHighestBid: {
          bidId: newHighestBid.id,
          bidderId: newHighestBid.bidderId,
          bidderName: newHighestBid.bidder?.name,
          amount: newHighestBid.amount,
        },
        previousHighestAmount: previousAmount || 0,
        amountIncrease: newHighestBid.amount - (previousAmount || 0),
        timestamp: new Date().toISOString(),
      };

      // Send to bid notifications queue (not used yet, for future analytics)
      await this.rabbitMQService.publishToQueue(
        'bid.notifications',
        event
      );

      this.logger.log(`📤 Published highest bid changed event for auction ${auctionId}`);
    } catch (error) {
      this.logger.error('Failed to publish highest bid changed event:', error);
    }
  }

  async publishReservePriceMet(auctionId: string, bid: BidResponseDto, reservePrice: number) {
    try {
      const event = {
        event: 'reserve_price_met',
        auctionId,
        bid: {
          bidId: bid.id,
          bidderId: bid.bidderId,
          bidderName: bid.bidder?.name,
          amount: bid.amount,
        },
        reservePrice,
        timestamp: new Date().toISOString(),
      };

      // Send to bid notifications queue for email to seller
      await this.rabbitMQService.publishToQueue(
        'bid.notifications',
        event
      );

      this.logger.log(`📤 Published reserve price met event for auction ${auctionId}`);
    } catch (error) {
      this.logger.error('Failed to publish reserve price met event:', error);
    }
  }

  async publishBidOutbid(outbidBidderId: string, auctionId: string, newHighestBid: BidResponseDto) {
    try {
      const event = {
        event: 'bid_outbid',
        outbidBidderId,
        auctionId,
        newHighestBid: {
          bidId: newHighestBid.id,
          bidderId: newHighestBid.bidderId,
          bidderName: newHighestBid.bidder?.name,
          amount: newHighestBid.amount,
        },
        timestamp: new Date().toISOString(),
      };

      // Send to bid notifications queue for outbid email
      await this.rabbitMQService.publishToQueue(
        'bid.notifications',
        event
      );

      this.logger.log(`📤 Published bid outbid event for bidder ${outbidBidderId} on auction ${auctionId}`);
    } catch (error) {
      this.logger.error('Failed to publish bid outbid event:', error);
    }
  }

  async startBidEventConsumer() {
    try {
      // Consumer untuk bid notifications
      await this.rabbitMQService.consumeQueue('bid.notifications', async (message) => {
        // this.logger.log('Processing bid notification:', message);
        
        // Di sini nanti bisa ditambahkan logic untuk:
        // - Send email notifications
        // - Send push notifications
        // - Update real-time dashboard
        // - Log analytics
        
        switch (message.event) {
          case 'bid_placed':
            await this.handleBidPlacedNotification(message);
            break;
          case 'highest_bid_changed':
            await this.handleHighestBidChangedNotification(message);
            break;
          case 'reserve_price_met':
            await this.handleReservePriceMetNotification(message);
            break;
          case 'bid_outbid':
            await this.handleBidOutbidNotification(message);
            break;
          default:
            this.logger.warn(`Unknown bid event type: ${message.event}`);
        }
      });

      // this.logger.log('Bid event consumer started successfully');
    } catch (error) {
      this.logger.error('Failed to start bid event consumer:', error);
    }
  }

  private async handleBidPlacedNotification(message: any) {
    this.logger.log(`New bid placed: $${message.amount} by ${message.bidderName} on ${message.itemTitle}`);
    
    // Future: Send email to seller
    // Future: Send push notification to auction watchers
    // Future: Update real-time websocket clients
  }

  private async handleHighestBidChangedNotification(message: any) {
    this.logger.log(`New highest bid: $${message.newHighestBid.amount} (increase: $${message.amountIncrease})`);
    
    // Future: Update auction display in real-time
    // Future: Send notifications to previous high bidder
  }

  private async handleReservePriceMetNotification(message: any) {
    this.logger.log(`Reserve price met for auction ${message.auctionId}: $${message.bid.amount}`);
    
    // Future: Send celebration notification to seller
    // Future: Update auction UI to show reserve met
  }

  private async handleBidOutbidNotification(message: any) {
    this.logger.log(`Bidder ${message.outbidBidderId} has been outbid on auction ${message.auctionId}`);
    
    // Future: Send "you've been outbid" notification
    // Future: Trigger auto-bid if enabled
  }
}