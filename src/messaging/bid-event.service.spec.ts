import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { BidEventService } from './bid-event.service';
import { RabbitMQService } from './rabbitmq.service';
import { BidResponseDto } from '../bids/dto/bid-response.dto';
import { AuctionStatus } from '../database/entities/auction.entity';

describe('BidEventService', () => {
  let service: BidEventService;
  let rabbitMQService: jest.Mocked<RabbitMQService>;

  const mockBidResponse: BidResponseDto = {
    id: 'bid-1',
    auctionId: 'auction-1',
    bidderId: 'bidder-1',
    amount: 150,
    isAuto: false,
    createdAt: new Date(),
    modifiedAt: new Date(),
    auction: {
      id: 'auction-1',
      status: AuctionStatus.RUNNING,
      item: {
        id: 'item-1',
        title: 'Test Item',
        description: 'Test Description',
      },
    },
    bidder: {
      id: 'bidder-1',
      name: 'Test Bidder',
      email: 'bidder@example.com',
    },
  };

  const mockAuctionDetails = {
    id: 'auction-1',
    item: {
      title: 'Test Item',
      sellerId: 'seller-1',
    },
  };

  beforeEach(async () => {
    const mockRabbitMQService = {
      publishMessage: jest.fn(),
      publishToQueue: jest.fn(),
      consumeQueue: jest.fn(),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      getChannel: jest.fn(),
      isConnected: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BidEventService,
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
      ],
    }).compile();

    service = module.get<BidEventService>(BidEventService);
    rabbitMQService = module.get(RabbitMQService);

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publishBidPlaced', () => {
    it('should publish bid placed event successfully', async () => {
      // Arrange
      rabbitMQService.publishMessage.mockResolvedValue();
      rabbitMQService.publishToQueue.mockResolvedValue();

      // Act
      await service.publishBidPlaced(mockBidResponse, mockAuctionDetails);

      // Assert
      expect(rabbitMQService.publishMessage).toHaveBeenCalledWith(
        'auction.exchange',
        'bid.placed',
        expect.objectContaining({
          event: 'bid_placed',
          bidId: mockBidResponse.id,
          auctionId: mockBidResponse.auctionId,
          bidderId: mockBidResponse.bidderId,
          bidderName: mockBidResponse.bidder?.name,
          amount: mockBidResponse.amount,
          isAuto: mockBidResponse.isAuto,
          itemTitle: mockAuctionDetails.item?.title,
          sellerId: mockAuctionDetails.item?.sellerId,
          timestamp: expect.any(String),
        }),
      );
      expect(rabbitMQService.publishToQueue).toHaveBeenCalledWith(
        'bid.notifications',
        expect.objectContaining({
          event: 'bid_placed',
        }),
      );
    });

    it('should handle publish errors gracefully', async () => {
      // Arrange
      const error = new Error('RabbitMQ connection failed');
      rabbitMQService.publishMessage.mockRejectedValue(error);

      // Act & Assert - should not throw
      await expect(service.publishBidPlaced(mockBidResponse, mockAuctionDetails)).resolves.not.toThrow();
      expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to publish bid placed event:', error);
    });
  });

  describe('publishHighestBidChanged', () => {
    it('should publish highest bid changed event successfully', async () => {
      // Arrange
      const previousAmount = 100;
      rabbitMQService.publishMessage.mockResolvedValue();

      // Act
      await service.publishHighestBidChanged('auction-1', mockBidResponse, previousAmount);

      // Assert
      expect(rabbitMQService.publishMessage).toHaveBeenCalledWith(
        'auction.exchange',
        'bid.highest.changed',
        expect.objectContaining({
          event: 'highest_bid_changed',
          auctionId: 'auction-1',
          newHighestBid: {
            bidId: mockBidResponse.id,
            bidderId: mockBidResponse.bidderId,
            bidderName: mockBidResponse.bidder?.name,
            amount: mockBidResponse.amount,
          },
          previousHighestAmount: previousAmount,
          amountIncrease: mockBidResponse.amount - previousAmount,
          timestamp: expect.any(String),
        }),
      );
    });

    it('should handle missing previous amount', async () => {
      // Arrange
      rabbitMQService.publishMessage.mockResolvedValue();

      // Act
      await service.publishHighestBidChanged('auction-1', mockBidResponse);

      // Assert
      expect(rabbitMQService.publishMessage).toHaveBeenCalledWith(
        'auction.exchange',
        'bid.highest.changed',
        expect.objectContaining({
          previousHighestAmount: 0,
          amountIncrease: mockBidResponse.amount,
        }),
      );
    });

    it('should handle publish errors gracefully', async () => {
      // Arrange
      const error = new Error('RabbitMQ connection failed');
      rabbitMQService.publishMessage.mockRejectedValue(error);

      // Act & Assert - should not throw
      await expect(service.publishHighestBidChanged('auction-1', mockBidResponse, 100)).resolves.not.toThrow();
      expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to publish highest bid changed event:', error);
    });
  });

  describe('publishReservePriceMet', () => {
    it('should publish reserve price met event successfully', async () => {
      // Arrange
      const reservePrice = 200;
      rabbitMQService.publishMessage.mockResolvedValue();

      // Act
      await service.publishReservePriceMet('auction-1', mockBidResponse, reservePrice);

      // Assert
      expect(rabbitMQService.publishMessage).toHaveBeenCalledWith(
        'auction.exchange',
        'auction.reserve.met',
        expect.objectContaining({
          event: 'reserve_price_met',
          auctionId: 'auction-1',
          bid: {
            bidId: mockBidResponse.id,
            bidderId: mockBidResponse.bidderId,
            bidderName: mockBidResponse.bidder?.name,
            amount: mockBidResponse.amount,
          },
          reservePrice,
          timestamp: expect.any(String),
        }),
      );
    });

    it('should handle publish errors gracefully', async () => {
      // Arrange
      const error = new Error('RabbitMQ connection failed');
      rabbitMQService.publishMessage.mockRejectedValue(error);

      // Act & Assert - should not throw
      await expect(service.publishReservePriceMet('auction-1', mockBidResponse, 200)).resolves.not.toThrow();
      expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to publish reserve price met event:', error);
    });
  });

  describe('publishBidOutbid', () => {
    it('should publish bid outbid event successfully', async () => {
      // Arrange
      const outbidBidderId = 'bidder-2';
      rabbitMQService.publishMessage.mockResolvedValue();

      // Act
      await service.publishBidOutbid(outbidBidderId, 'auction-1', mockBidResponse);

      // Assert
      expect(rabbitMQService.publishMessage).toHaveBeenCalledWith(
        'auction.exchange',
        'bid.outbid',
        expect.objectContaining({
          event: 'bid_outbid',
          outbidBidderId,
          auctionId: 'auction-1',
          newHighestBid: {
            bidId: mockBidResponse.id,
            bidderId: mockBidResponse.bidderId,
            bidderName: mockBidResponse.bidder?.name,
            amount: mockBidResponse.amount,
          },
          timestamp: expect.any(String),
        }),
      );
    });

    it('should handle publish errors gracefully', async () => {
      // Arrange
      const error = new Error('RabbitMQ connection failed');
      rabbitMQService.publishMessage.mockRejectedValue(error);

      // Act & Assert - should not throw
      await expect(service.publishBidOutbid('bidder-2', 'auction-1', mockBidResponse)).resolves.not.toThrow();
      expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to publish bid outbid event:', error);
    });
  });

  describe('startBidEventConsumer', () => {
    it('should start bid event consumer successfully', async () => {
      // Arrange
      rabbitMQService.consumeQueue.mockResolvedValue();

      // Act
      await service.startBidEventConsumer();

      // Assert
      expect(rabbitMQService.consumeQueue).toHaveBeenCalledWith(
        'bid.notifications',
        expect.any(Function),
      );
    });

    it('should handle consumer startup errors', async () => {
      // Arrange
      const error = new Error('Failed to start consumer');
      rabbitMQService.consumeQueue.mockRejectedValue(error);

      // Act & Assert - should not throw
      await expect(service.startBidEventConsumer()).resolves.not.toThrow();
      expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to start bid event consumer:', error);
    });
  });

  describe('private message handlers', () => {
    it('should handle bid placed notification', async () => {
      // Arrange
      const message = {
        event: 'bid_placed',
        amount: 150,
        bidderName: 'Test Bidder',
        itemTitle: 'Test Item',
      };

      // Act - access private method through callback
      await service.startBidEventConsumer();
      const callback = rabbitMQService.consumeQueue.mock.calls[0][1];
      await callback(message);

      // Assert
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('New bid placed: $150 by Test Bidder on Test Item'),
      );
    });

    it('should handle unknown event types', async () => {
      // Arrange
      const message = {
        event: 'unknown_event',
      };

      // Act - access private method through callback
      await service.startBidEventConsumer();
      const callback = rabbitMQService.consumeQueue.mock.calls[0][1];
      await callback(message);

      // Assert
      expect(Logger.prototype.warn).toHaveBeenCalledWith('Unknown bid event type: unknown_event');
    });
  });
});