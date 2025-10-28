import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { Auction, AuctionStatus } from '../database/entities/auction.entity';
import { Item } from '../database/entities/item.entity';
import { Bid } from '../database/entities/bid.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { GetAuctionsQueryDto } from './dto/get-auctions-query.dto';

describe('AuctionsService', () => {
  let service: AuctionsService;
  let auctionRepository: jest.Mocked<Repository<Auction>>;
  let itemRepository: jest.Mocked<Repository<Item>>;
  let bidRepository: jest.Mocked<Repository<Bid>>;

  const mockSeller: User = {
    id: 'seller-1',
    email: 'seller@example.com',
    password: 'hashedPassword',
    name: 'Seller User',
    role: UserRole.SELLER,
    createdAt: new Date(),
    modifiedAt: new Date(),
    items: [],
    bids: [],
    watchlists: [],
    payments: [],
  };

  const mockItem: Item = {
    id: 'item-1',
    sellerId: 'seller-1',
    title: 'Test Item',
    description: 'Test Description',
    metadata: {},
    createdAt: new Date(),
    modifiedAt: new Date(),
    seller: mockSeller,
    auction: null,
  };

  const mockAuction: Auction = {
    id: 'auction-1',
    itemId: 'item-1',
    startingPrice: 100,
    reservePrice: 200,
    buyNowPrice: 500,
    minIncrement: 10,
    startAt: new Date(Date.now() + 86400000), // tomorrow
    endAt: new Date(Date.now() + 172800000), // day after tomorrow
    status: AuctionStatus.SCHEDULED,
    autoExtendSeconds: 300,
    createdAt: new Date(),
    modifiedAt: new Date(),
    item: mockItem,
    bids: [],
    payments: [],
    watchlists: [],
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

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    where: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
  };

  beforeEach(async () => {
    const mockAuctionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const mockItemRepository = {
      findOne: jest.fn(),
    };

    const mockBidRepository = {
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionsService,
        {
          provide: getRepositoryToken(Auction),
          useValue: mockAuctionRepository,
        },
        {
          provide: getRepositoryToken(Item),
          useValue: mockItemRepository,
        },
        {
          provide: getRepositoryToken(Bid),
          useValue: mockBidRepository,
        },
      ],
    }).compile();

    service = module.get<AuctionsService>(AuctionsService);
    auctionRepository = module.get(getRepositoryToken(Auction));
    itemRepository = module.get(getRepositoryToken(Item));
    bidRepository = module.get(getRepositoryToken(Bid));

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create auction successfully', async () => {
      // Arrange
      itemRepository.findOne.mockResolvedValue(mockItem);
      auctionRepository.create.mockReturnValue(mockAuction);
      auctionRepository.save.mockResolvedValue(mockAuction);
      
      // Mock the findOne method that's called at the end
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: mockAuction.id,
        itemId: mockAuction.itemId,
        startingPrice: mockAuction.startingPrice,
        reservePrice: mockAuction.reservePrice,
        buyNowPrice: mockAuction.buyNowPrice,
        minIncrement: mockAuction.minIncrement,
        startAt: mockAuction.startAt,
        endAt: mockAuction.endAt,
        status: mockAuction.status,
        autoExtendSeconds: mockAuction.autoExtendSeconds,
        createdAt: mockAuction.createdAt,
        modifiedAt: mockAuction.modifiedAt,
        item: {
          id: mockItem.id,
          title: mockItem.title,
          description: mockItem.description,
          sellerId: mockItem.sellerId,
          metadata: mockItem.metadata,
          seller: {
            id: mockSeller.id,
            email: mockSeller.email,
            name: mockSeller.name,
            role: mockSeller.role,
          },
        },
        currentHighestBid: undefined,
        bidCount: 0,
        timeRemaining: undefined,
        reservePriceMet: true,
      });

      // Act
      const result = await service.create(mockCreateAuctionDto, 'seller-1');

      // Assert
      expect(itemRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCreateAuctionDto.itemId },
        relations: ['seller', 'auction'],
      });
      expect(auctionRepository.create).toHaveBeenCalledWith({
        ...mockCreateAuctionDto,
        startAt: expect.any(Date),
        endAt: expect.any(Date),
        status: AuctionStatus.SCHEDULED,
      });
      expect(auctionRepository.save).toHaveBeenCalledWith(mockAuction);
      expect(result).toBeDefined();
      expect(result.id).toBe(mockAuction.id);
    });

    it('should throw NotFoundException if item not found', async () => {
      // Arrange
      itemRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(mockCreateAuctionDto, 'seller-1')).rejects.toThrow(
        new NotFoundException(`Item with ID ${mockCreateAuctionDto.itemId} not found`),
      );
    });

    it('should throw ForbiddenException if item does not belong to seller', async () => {
      // Arrange
      const itemWithDifferentSeller = { ...mockItem, sellerId: 'different-seller' };
      itemRepository.findOne.mockResolvedValue(itemWithDifferentSeller);

      // Act & Assert
      await expect(service.create(mockCreateAuctionDto, 'seller-1')).rejects.toThrow(
        new ForbiddenException('You can only create auctions for your own items'),
      );
    });

    it('should throw BadRequestException if item already has auction', async () => {
      // Arrange
      const itemWithAuction = { ...mockItem, auction: mockAuction };
      itemRepository.findOne.mockResolvedValue(itemWithAuction);

      // Act & Assert
      await expect(service.create(mockCreateAuctionDto, 'seller-1')).rejects.toThrow(
        new BadRequestException('Item already has an auction'),
      );
    });

    it('should throw BadRequestException if start time is in the past', async () => {
      // Arrange
      itemRepository.findOne.mockResolvedValue(mockItem);
      const pastStartTime = { ...mockCreateAuctionDto, startAt: new Date(Date.now() - 86400000).toISOString() };

      // Act & Assert
      await expect(service.create(pastStartTime, 'seller-1')).rejects.toThrow(
        new BadRequestException('Start time must be in the future'),
      );
    });

    it('should throw BadRequestException if end time is before start time', async () => {
      // Arrange
      itemRepository.findOne.mockResolvedValue(mockItem);
      const invalidEndTime = {
        ...mockCreateAuctionDto,
        startAt: new Date(Date.now() + 86400000).toISOString(),
        endAt: new Date(Date.now() + 43200000).toISOString(), // 12 hours from now (before start time)
      };

      // Act & Assert
      await expect(service.create(invalidEndTime, 'seller-1')).rejects.toThrow(
        new BadRequestException('End time must be after start time'),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated auctions', async () => {
      // Arrange
      const queryDto: GetAuctionsQueryDto = { page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockAuction], 1]);

      // Mock transformToResponseDto
      jest.spyOn(service as any, 'transformToResponseDto').mockResolvedValue({
        id: mockAuction.id,
        itemId: mockAuction.itemId,
        startingPrice: mockAuction.startingPrice,
        // ... other properties
      });

      // Act
      const result = await service.findAll(queryDto);

      // Assert
      expect(result).toEqual({
        auctions: expect.any(Array),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should apply search filter when q is provided', async () => {
      // Arrange
      const queryDto: GetAuctionsQueryDto = { q: 'test', page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.findAll(queryDto);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(item.title) LIKE LOWER(:search) OR LOWER(item.description) LIKE LOWER(:search))',
        { search: '%test%' },
      );
    });

    it('should apply status filter when status is provided', async () => {
      // Arrange
      const queryDto: GetAuctionsQueryDto = { status: AuctionStatus.RUNNING, page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.findAll(queryDto);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'auction.status = :status',
        { status: AuctionStatus.RUNNING },
      );
    });
  });

  describe('findOne', () => {
    it('should return auction when found', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(mockAuction);
      jest.spyOn(service as any, 'transformToResponseDto').mockResolvedValue({
        id: mockAuction.id,
        itemId: mockAuction.itemId,
        // ... other properties
      });

      // Act
      const result = await service.findOne('auction-1');

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'auction.id = :id',
        { id: 'auction-1' },
      );
      expect(result).toBeDefined();
      expect(result.id).toBe(mockAuction.id);
    });

    it('should throw NotFoundException when auction not found', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('Auction with ID non-existent-id not found'),
      );
    });
  });

  describe('update', () => {
    it('should update auction successfully', async () => {
      // Arrange
      const updateDto: UpdateAuctionDto = { startingPrice: 150 };
      auctionRepository.findOne.mockResolvedValue(mockAuction);
      auctionRepository.update.mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: mockAuction.id,
        itemId: mockAuction.itemId,
        startingPrice: 150,
        // ... other properties
      } as any);

      // Act
      const result = await service.update('auction-1', updateDto, mockSeller);

      // Assert
      expect(auctionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'auction-1' },
        relations: ['item', 'item.seller'],
      });
      expect(auctionRepository.update).toHaveBeenCalledWith('auction-1', updateDto);
      expect(result.startingPrice).toBe(150);
    });

    it('should throw NotFoundException when auction not found', async () => {
      // Arrange
      auctionRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('non-existent-id', {}, mockSeller)).rejects.toThrow(
        new NotFoundException('Auction with ID non-existent-id not found'),
      );
    });

    it('should throw ForbiddenException when user is not owner or admin', async () => {
      // Arrange
      const differentUser = { ...mockSeller, id: 'different-user', role: UserRole.USER };
      auctionRepository.findOne.mockResolvedValue(mockAuction);

      // Act & Assert
      await expect(service.update('auction-1', {}, differentUser)).rejects.toThrow(
        new ForbiddenException('You can only update your own auctions'),
      );
    });

    it('should throw BadRequestException when trying to update running auction', async () => {
      // Arrange
      const runningAuction = { ...mockAuction, status: AuctionStatus.RUNNING };
      auctionRepository.findOne.mockResolvedValue(runningAuction);

      // Act & Assert
      await expect(service.update('auction-1', {}, mockSeller)).rejects.toThrow(
        new BadRequestException('Cannot update running or ended auctions'),
      );
    });
  });

  describe('remove', () => {
    it('should remove auction successfully', async () => {
      // Arrange
      auctionRepository.findOne.mockResolvedValue(mockAuction);
      auctionRepository.remove.mockResolvedValue(mockAuction);

      // Act
      await service.remove('auction-1', mockSeller);

      // Assert
      expect(auctionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'auction-1' },
        relations: ['item', 'item.seller', 'bids'],
      });
      expect(auctionRepository.remove).toHaveBeenCalledWith(mockAuction);
    });

    it('should throw NotFoundException when auction not found', async () => {
      // Arrange
      auctionRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent-id', mockSeller)).rejects.toThrow(
        new NotFoundException('Auction with ID non-existent-id not found'),
      );
    });

    it('should throw ForbiddenException when user is not owner or admin', async () => {
      // Arrange
      const differentUser = { ...mockSeller, id: 'different-user', role: UserRole.USER };
      auctionRepository.findOne.mockResolvedValue(mockAuction);

      // Act & Assert
      await expect(service.remove('auction-1', differentUser)).rejects.toThrow(
        new ForbiddenException('You can only delete your own auctions'),
      );
    });

    it('should throw BadRequestException when trying to delete running auction', async () => {
      // Arrange
      const runningAuction = { ...mockAuction, status: AuctionStatus.RUNNING };
      auctionRepository.findOne.mockResolvedValue(runningAuction);

      // Act & Assert
      await expect(service.remove('auction-1', mockSeller)).rejects.toThrow(
        new BadRequestException('Cannot delete running or ended auctions'),
      );
    });

    it('should throw BadRequestException when auction has bids', async () => {
      // Arrange
      const auctionWithBids = { ...mockAuction, bids: [{ id: 'bid-1' }] };
      auctionRepository.findOne.mockResolvedValue(auctionWithBids as any);

      // Act & Assert
      await expect(service.remove('auction-1', mockSeller)).rejects.toThrow(
        new BadRequestException('Cannot delete auction with existing bids'),
      );
    });
  });
});