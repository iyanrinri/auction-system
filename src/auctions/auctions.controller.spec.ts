import { Test, TestingModule } from '@nestjs/testing';
import { AuctionsController } from './auctions.controller';
import { AuctionsService } from './auctions.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { GetAuctionsQueryDto } from './dto/get-auctions-query.dto';
import { AuctionResponseDto, PaginatedAuctionsResponseDto } from './dto/auction-response.dto';
import { AuctionStatus } from '../database/entities/auction.entity';
import { UserRole } from '../database/entities/user.entity';

describe('AuctionsController', () => {
  let controller: AuctionsController;
  let auctionsService: jest.Mocked<AuctionsService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.SELLER,
  };

  const mockAuctionResponse: AuctionResponseDto = {
    id: 'auction-1',
    itemId: 'item-1',
    startingPrice: 100,
    reservePrice: 200,
    buyNowPrice: 500,
    minIncrement: 10,
    startAt: new Date(),
    endAt: new Date(),
    status: AuctionStatus.SCHEDULED,
    autoExtendSeconds: 300,
    createdAt: new Date(),
    modifiedAt: new Date(),
    item: {
      id: 'item-1',
      title: 'Test Item',
      description: 'Test Description',
      sellerId: 'user-1',
      metadata: {},
      seller: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.SELLER,
      },
    },
    bidCount: 0,
    reservePriceMet: true,
  };

  const mockCreateAuctionDto: CreateAuctionDto = {
    itemId: 'item-1',
    startingPrice: 100,
    reservePrice: 200,
    buyNowPrice: 500,
    minIncrement: 10,
    startAt: new Date(Date.now() + 86400000).toISOString(),
    endAt: new Date(Date.now() + 172800000).toISOString(),
    autoExtendSeconds: 300,
  };

  const mockUpdateAuctionDto: UpdateAuctionDto = {
    startingPrice: 150,
  };

  const mockPaginatedResponse: PaginatedAuctionsResponseDto = {
    auctions: [mockAuctionResponse],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  beforeEach(async () => {
    const mockAuctionsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findBySellerId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuctionsController],
      providers: [
        {
          provide: AuctionsService,
          useValue: mockAuctionsService,
        },
      ],
    }).compile();

    controller = module.get<AuctionsController>(AuctionsController);
    auctionsService = module.get(AuctionsService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create auction successfully', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      auctionsService.create.mockResolvedValue(mockAuctionResponse);

      // Act
      const result = await controller.create(mockCreateAuctionDto, mockRequest);

      // Assert
      expect(auctionsService.create).toHaveBeenCalledWith(mockCreateAuctionDto, mockUser.id);
      expect(result).toEqual(mockAuctionResponse);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      const error = new Error('Creation failed');
      auctionsService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(mockCreateAuctionDto, mockRequest)).rejects.toThrow(error);
      expect(auctionsService.create).toHaveBeenCalledWith(mockCreateAuctionDto, mockUser.id);
    });
  });

  describe('findAll', () => {
    it('should return paginated auctions', async () => {
      // Arrange
      const query: GetAuctionsQueryDto = { page: 1, limit: 10 };
      auctionsService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(auctionsService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle empty query parameters', async () => {
      // Arrange
      const query: GetAuctionsQueryDto = {};
      auctionsService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(auctionsService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle search and filter parameters', async () => {
      // Arrange
      const query: GetAuctionsQueryDto = {
        q: 'test',
        status: AuctionStatus.RUNNING,
        sellerId: 'seller-1',
        minPrice: 100,
        maxPrice: 1000,
        page: 2,
        limit: 5,
        sortBy: 'startingPrice',
        sortOrder: 'DESC',
      };
      auctionsService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(auctionsService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('findMyAuctions', () => {
    it('should return user\'s auctions', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      const myAuctions = [mockAuctionResponse];
      auctionsService.findBySellerId.mockResolvedValue(myAuctions);

      // Act
      const result = await controller.findMyAuctions(mockRequest);

      // Assert
      expect(auctionsService.findBySellerId).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(myAuctions);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      const error = new Error('Failed to find auctions');
      auctionsService.findBySellerId.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findMyAuctions(mockRequest)).rejects.toThrow(error);
      expect(auctionsService.findBySellerId).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('findOne', () => {
    it('should return auction by ID', async () => {
      // Arrange
      const auctionId = 'auction-1';
      auctionsService.findOne.mockResolvedValue(mockAuctionResponse);

      // Act
      const result = await controller.findOne(auctionId);

      // Assert
      expect(auctionsService.findOne).toHaveBeenCalledWith(auctionId);
      expect(result).toEqual(mockAuctionResponse);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const auctionId = 'non-existent-id';
      const error = new Error('Auction not found');
      auctionsService.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findOne(auctionId)).rejects.toThrow(error);
      expect(auctionsService.findOne).toHaveBeenCalledWith(auctionId);
    });
  });

  describe('update', () => {
    it('should update auction successfully', async () => {
      // Arrange
      const auctionId = 'auction-1';
      const mockRequest = { user: mockUser };
      const updatedAuction = { ...mockAuctionResponse, startingPrice: 150 };
      auctionsService.update.mockResolvedValue(updatedAuction);

      // Act
      const result = await controller.update(auctionId, mockUpdateAuctionDto, mockRequest);

      // Assert
      expect(auctionsService.update).toHaveBeenCalledWith(auctionId, mockUpdateAuctionDto, mockUser);
      expect(result).toEqual(updatedAuction);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const auctionId = 'auction-1';
      const mockRequest = { user: mockUser };
      const error = new Error('Update failed');
      auctionsService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(auctionId, mockUpdateAuctionDto, mockRequest)).rejects.toThrow(error);
      expect(auctionsService.update).toHaveBeenCalledWith(auctionId, mockUpdateAuctionDto, mockUser);
    });
  });

  describe('remove', () => {
    it('should remove auction successfully', async () => {
      // Arrange
      const auctionId = 'auction-1';
      const mockRequest = { user: mockUser };
      auctionsService.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(auctionId, mockRequest);

      // Assert
      expect(auctionsService.remove).toHaveBeenCalledWith(auctionId, mockUser);
      expect(result).toBeUndefined();
    });

    it('should propagate service errors', async () => {
      // Arrange
      const auctionId = 'auction-1';
      const mockRequest = { user: mockUser };
      const error = new Error('Delete failed');
      auctionsService.remove.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.remove(auctionId, mockRequest)).rejects.toThrow(error);
      expect(auctionsService.remove).toHaveBeenCalledWith(auctionId, mockUser);
    });
  });
});