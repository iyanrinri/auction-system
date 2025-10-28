import { Test, TestingModule } from '@nestjs/testing';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { GetBidsQueryDto } from './dto/get-bids-query.dto';
import { BidResponseDto, PaginatedBidsResponseDto } from './dto/bid-response.dto';
import { AuctionStatus } from '../database/entities/auction.entity';
import { UserRole } from '../database/entities/user.entity';

describe('BidsController', () => {
  let controller: BidsController;
  let bidsService: jest.Mocked<BidsService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
  };

  const mockBidResponse: BidResponseDto = {
    id: 'bid-1',
    auctionId: 'auction-1',
    bidderId: 'user-1',
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
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  const mockCreateBidDto: CreateBidDto = {
    auctionId: 'auction-1',
    amount: 150,
    isAuto: false,
  };

  const mockPaginatedResponse: PaginatedBidsResponseDto = {
    bids: [mockBidResponse],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  beforeEach(async () => {
    const mockBidsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByBidderId: jest.fn(),
      findByAuctionId: jest.fn(),
      getHighestBidForAuction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BidsController],
      providers: [
        {
          provide: BidsService,
          useValue: mockBidsService,
        },
      ],
    }).compile();

    controller = module.get<BidsController>(BidsController);
    bidsService = module.get(BidsService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create bid successfully', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      bidsService.create.mockResolvedValue(mockBidResponse);

      // Act
      const result = await controller.create(mockCreateBidDto, mockRequest);

      // Assert
      expect(bidsService.create).toHaveBeenCalledWith(mockCreateBidDto, mockUser.id);
      expect(result).toEqual(mockBidResponse);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      const error = new Error('Bid creation failed');
      bidsService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(mockCreateBidDto, mockRequest)).rejects.toThrow(error);
      expect(bidsService.create).toHaveBeenCalledWith(mockCreateBidDto, mockUser.id);
    });
  });

  describe('findAll', () => {
    it('should return paginated bids', async () => {
      // Arrange
      const query: GetBidsQueryDto = { page: 1, limit: 10 };
      bidsService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(bidsService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle empty query parameters', async () => {
      // Arrange
      const query: GetBidsQueryDto = {};
      bidsService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(bidsService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle filter parameters', async () => {
      // Arrange
      const query: GetBidsQueryDto = {
        auctionId: 'auction-1',
        bidderId: 'bidder-1',
        page: 2,
        limit: 5,
        sortBy: 'amount',
        sortOrder: 'DESC',
      };
      bidsService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(bidsService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('findMyBids', () => {
    it('should return user\'s bids', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      const myBids = [mockBidResponse];
      bidsService.findByBidderId.mockResolvedValue(myBids);

      // Act
      const result = await controller.findMyBids(mockRequest);

      // Assert
      expect(bidsService.findByBidderId).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(myBids);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      const error = new Error('Failed to find bids');
      bidsService.findByBidderId.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findMyBids(mockRequest)).rejects.toThrow(error);
      expect(bidsService.findByBidderId).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('findByAuctionId', () => {
    it('should return bids for auction', async () => {
      // Arrange
      const auctionId = 'auction-1';
      const auctionBids = [mockBidResponse];
      bidsService.findByAuctionId.mockResolvedValue(auctionBids);

      // Act
      const result = await controller.findByAuctionId(auctionId);

      // Assert
      expect(bidsService.findByAuctionId).toHaveBeenCalledWith(auctionId);
      expect(result).toEqual(auctionBids);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const auctionId = 'non-existent-auction';
      const error = new Error('Auction not found');
      bidsService.findByAuctionId.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findByAuctionId(auctionId)).rejects.toThrow(error);
      expect(bidsService.findByAuctionId).toHaveBeenCalledWith(auctionId);
    });
  });

  describe('getHighestBid', () => {
    it('should return highest bid for auction', async () => {
      // Arrange
      const auctionId = 'auction-1';
      bidsService.getHighestBidForAuction.mockResolvedValue(mockBidResponse);

      // Act
      const result = await controller.getHighestBid(auctionId);

      // Assert
      expect(bidsService.getHighestBidForAuction).toHaveBeenCalledWith(auctionId);
      expect(result).toEqual(mockBidResponse);
    });

    it('should return null when no bids found', async () => {
      // Arrange
      const auctionId = 'auction-1';
      bidsService.getHighestBidForAuction.mockResolvedValue(null);

      // Act
      const result = await controller.getHighestBid(auctionId);

      // Assert
      expect(bidsService.getHighestBidForAuction).toHaveBeenCalledWith(auctionId);
      expect(result).toBeNull();
    });

    it('should propagate service errors', async () => {
      // Arrange
      const auctionId = 'non-existent-auction';
      const error = new Error('Auction not found');
      bidsService.getHighestBidForAuction.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getHighestBid(auctionId)).rejects.toThrow(error);
      expect(bidsService.getHighestBidForAuction).toHaveBeenCalledWith(auctionId);
    });
  });

  describe('findOne', () => {
    it('should return bid by ID', async () => {
      // Arrange
      const bidId = 'bid-1';
      bidsService.findOne.mockResolvedValue(mockBidResponse);

      // Act
      const result = await controller.findOne(bidId);

      // Assert
      expect(bidsService.findOne).toHaveBeenCalledWith(bidId);
      expect(result).toEqual(mockBidResponse);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const bidId = 'non-existent-bid';
      const error = new Error('Bid not found');
      bidsService.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findOne(bidId)).rejects.toThrow(error);
      expect(bidsService.findOne).toHaveBeenCalledWith(bidId);
    });
  });
});