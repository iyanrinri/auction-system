import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BidsService } from './bids.service';
import { Bid } from '../database/entities/bid.entity';
import { Auction, AuctionStatus } from '../database/entities/auction.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { Item } from '../database/entities/item.entity';
import { CreateBidDto, GetBidsQueryDto } from './dto';
import { BidEventService } from '../messaging/bid-event.service';
import { AuctionsGateway } from '../auctions/auctions.gateway';

// Helper factories to reduce memory footprint
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'user@example.com',
  password: 'hashedPassword',
  name: 'Test User',
  role: UserRole.USER,
  createdAt: new Date('2025-01-01'),
  modifiedAt: new Date('2025-01-01'),
  items: [],
  bids: [],
  watchlists: [],
  payments: [],
  ...overrides,
});

const createMockItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'item-1',
  sellerId: 'seller-1',
  title: 'Test Item',
  description: 'Test Description',
  metadata: {},
  createdAt: new Date('2025-01-01'),
  modifiedAt: new Date('2025-01-01'),
  seller: null as any,
  auction: null as any,
  ...overrides,
});

const createMockAuction = (overrides: Partial<Auction> = {}): Auction => ({
  id: 'auction-1',
  itemId: 'item-1',
  startingPrice: 100,
  reservePrice: 200,
  buyNowPrice: 500,
  minIncrement: 10,
  startAt: new Date(Date.now() - 86400000),
  endAt: new Date(Date.now() + 86400000),
  status: AuctionStatus.RUNNING,
  autoExtendSeconds: 300,
  createdAt: new Date('2025-01-01'),
  modifiedAt: new Date('2025-01-01'),
  item: null as any,
  bids: [],
  payments: [],
  watchlists: [],
  ...overrides,
});

const createMockBid = (overrides: Partial<Bid> = {}): Bid => ({
  id: 'bid-1',
  auctionId: 'auction-1',
  bidderId: 'bidder-1',
  amount: 150,
  isAuto: false,
  createdAt: new Date('2025-01-01'),
  modifiedAt: new Date('2025-01-01'),
  auction: null as any,
  bidder: null as any,
  ...overrides,
});

describe('BidsService', () => {
  let service: BidsService;
  let bidRepository: jest.Mocked<Repository<Bid>>;
  let auctionRepository: jest.Mocked<Repository<Auction>>;
  let bidEventService: jest.Mocked<BidEventService>;
  let auctionsGateway: jest.Mocked<AuctionsGateway>;

  // Reusable test data
  let mockSeller: User;
  let mockBidder: User;
  let mockItem: Item;
  let mockAuction: Auction;
  let mockBid: Bid;
  let mockCreateBidDto: CreateBidDto;

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
    // Initialize mock data
    mockSeller = createMockUser({ id: 'seller-1', role: UserRole.SELLER, email: 'seller@example.com', name: 'Seller User' });
    mockBidder = createMockUser({ id: 'bidder-1', role: UserRole.USER, email: 'bidder@example.com', name: 'Bidder User' });
    mockItem = createMockItem({ sellerId: 'seller-1' });
    mockAuction = createMockAuction();
    mockBid = createMockBid();
    mockCreateBidDto = {
      auctionId: 'auction-1',
      amount: 150,
      isAuto: false,
    };

    // Link relationships
    mockItem.seller = mockSeller;
    mockAuction.item = mockItem;
    mockBid.auction = mockAuction;
    mockBid.bidder = mockBidder;
    const mockBidRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const mockAuctionRepository = {
      findOne: jest.fn(),
    };

    const mockBidEventService = {
      publishBidPlaced: jest.fn(),
      publishHighestBidChanged: jest.fn(),
      publishReservePriceMet: jest.fn(),
      publishBidOutbid: jest.fn(),
    };

    const mockAuctionsGateway = {
      emitNewBid: jest.fn(),
      emitPriceUpdate: jest.fn(),
      emitAuctionStatusChange: jest.fn(),
      emitAuctionEndingSoon: jest.fn(),
      getActiveViewers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BidsService,
        {
          provide: getRepositoryToken(Bid),
          useValue: mockBidRepository,
        },
        {
          provide: getRepositoryToken(Auction),
          useValue: mockAuctionRepository,
        },
        {
          provide: BidEventService,
          useValue: mockBidEventService,
        },
        {
          provide: AuctionsGateway,
          useValue: mockAuctionsGateway,
        },
      ],
    }).compile();

    service = module.get<BidsService>(BidsService);
    bidRepository = module.get(getRepositoryToken(Bid));
    auctionRepository = module.get(getRepositoryToken(Auction));
    bidEventService = module.get(BidEventService);
    auctionsGateway = module.get(AuctionsGateway);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create bid successfully', async () => {
      // Arrange
      auctionRepository.findOne.mockResolvedValue(mockAuction);
      bidRepository.findOne.mockResolvedValueOnce(null); // no current highest bid
      bidRepository.findOne.mockResolvedValueOnce(null); // no existing bid from user
      bidRepository.create.mockReturnValue(mockBid);
      bidRepository.save.mockResolvedValue(mockBid);
      bidRepository.count.mockResolvedValue(1); // Mock count for WebSocket update
      
      // Mock findOne to return complete bid response
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: mockBid.id,
        auctionId: mockBid.auctionId,
        bidderId: mockBid.bidderId,
        amount: mockBid.amount,
        isAuto: mockBid.isAuto,
        createdAt: mockBid.createdAt,
        modifiedAt: mockBid.modifiedAt,
        auction: {
          id: mockAuction.id,
          status: mockAuction.status,
          item: {
            id: mockItem.id,
            title: mockItem.title,
            description: mockItem.description || '',
          },
        },
        bidder: {
          id: mockBidder.id,
          name: mockBidder.name || '',
          email: mockBidder.email,
        },
      });

      // Act
      const result = await service.create(mockCreateBidDto, 'bidder-1');

      // Assert
      expect(auctionRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCreateBidDto.auctionId },
        relations: ['item', 'item.seller'],
      });
      expect(bidRepository.create).toHaveBeenCalledWith({
        auctionId: mockCreateBidDto.auctionId,
        bidderId: 'bidder-1',
        amount: mockCreateBidDto.amount,
        isAuto: mockCreateBidDto.isAuto,
      });
      expect(bidRepository.save).toHaveBeenCalledWith(mockBid);
      expect(auctionsGateway.emitNewBid).toHaveBeenCalled();
      expect(auctionsGateway.emitPriceUpdate).toHaveBeenCalled();
      expect(bidEventService.publishBidPlaced).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe(mockBid.id);
    });

    it('should throw NotFoundException if auction not found', async () => {
      // Arrange
      auctionRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(mockCreateBidDto, 'bidder-1')).rejects.toThrow(
        new NotFoundException('Auction not found'),
      );
    });

    it('should throw BadRequestException if auction is not running', async () => {
      // Arrange
      const scheduledAuction = { ...mockAuction, status: AuctionStatus.SCHEDULED };
      auctionRepository.findOne.mockResolvedValue(scheduledAuction);

      // Act & Assert
      await expect(service.create(mockCreateBidDto, 'bidder-1')).rejects.toThrow(
        new BadRequestException('Auction is not running for bidding'),
      );
    });

    it('should throw BadRequestException if auction has ended', async () => {
      // Arrange
      const endedAuction = { 
        ...mockAuction, 
        endAt: new Date(Date.now() - 86400000) // yesterday
      };
      auctionRepository.findOne.mockResolvedValue(endedAuction);

      // Act & Assert
      await expect(service.create(mockCreateBidDto, 'bidder-1')).rejects.toThrow(
        new BadRequestException('Auction has ended'),
      );
    });

    it('should throw ForbiddenException if bidder is the seller', async () => {
      // Arrange
      auctionRepository.findOne.mockResolvedValue(mockAuction);

      // Act & Assert
      await expect(service.create(mockCreateBidDto, 'seller-1')).rejects.toThrow(
        new ForbiddenException('Sellers cannot bid on their own auctions'),
      );
    });

    it('should throw BadRequestException if bid amount is too low', async () => {
      // Arrange
      auctionRepository.findOne.mockResolvedValue(mockAuction);
      const existingBid = { ...mockBid, amount: 140 };
      bidRepository.findOne.mockResolvedValueOnce(existingBid); // current highest bid
      
      const lowBidDto = { ...mockCreateBidDto, amount: 145 }; // less than required 150 (140 + 10)

      // Act & Assert
      await expect(service.create(lowBidDto, 'bidder-1')).rejects.toThrow(
        new BadRequestException('Bid amount must be at least $150.00 (current minimum bid)'),
      );
    });

    it('should throw BadRequestException if user already has higher or equal bid', async () => {
      // Arrange
      auctionRepository.findOne.mockResolvedValue(mockAuction);
      bidRepository.findOne.mockResolvedValueOnce(null); // no current highest bid
      const existingUserBid = { ...mockBid, amount: 200 };
      bidRepository.findOne.mockResolvedValueOnce(existingUserBid); // existing bid from user

      const lowerBidDto = { ...mockCreateBidDto, amount: 150 };

      // Act & Assert
      await expect(service.create(lowerBidDto, 'bidder-1')).rejects.toThrow(
        new BadRequestException('You already have a higher or equal bid on this auction'),
      );
    });

    it('should publish reserve price met event when reserve is reached', async () => {
      // Arrange
      auctionRepository.findOne.mockResolvedValue(mockAuction);
      const lowExistingBid = { ...mockBid, amount: 120 };
      bidRepository.findOne.mockResolvedValueOnce(lowExistingBid); // current highest bid below reserve
      bidRepository.findOne.mockResolvedValueOnce(null); // no existing bid from user
      bidRepository.create.mockReturnValue(mockBid);
      bidRepository.save.mockResolvedValue(mockBid);
      bidRepository.count.mockResolvedValue(2); // Mock count for WebSocket update
      
      jest.spyOn(service, 'findOne').mockResolvedValue({} as any);

      const reservePriceBidDto = { ...mockCreateBidDto, amount: 250 }; // above reserve price

      // Act
      await service.create(reservePriceBidDto, 'bidder-1');

      // Assert
      expect(bidEventService.publishReservePriceMet).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated bids', async () => {
      // Arrange
      const query: GetBidsQueryDto = { page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockBid], 1]);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result.bids).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should apply auction filter when auctionId is provided', async () => {
      // Arrange
      const query: GetBidsQueryDto = { auctionId: 'auction-1', page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.findAll(query);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'bid.auctionId = :auctionId',
        { auctionId: 'auction-1' },
      );
    });

    it('should apply bidder filter when bidderId is provided', async () => {
      // Arrange
      const query: GetBidsQueryDto = { bidderId: 'bidder-1', page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.findAll(query);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'bid.bidderId = :bidderId',
        { bidderId: 'bidder-1' },
      );
    });
  });

  describe('findOne', () => {
    it('should return bid when found', async () => {
      // Arrange
      bidRepository.findOne.mockResolvedValue(mockBid);

      // Act
      const result = await service.findOne('bid-1');

      // Assert
      expect(bidRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'bid-1' },
        relations: ['auction', 'auction.item', 'bidder'],
      });
      expect(result).toBeDefined();
      expect(result.id).toBe(mockBid.id);
    });

    it('should throw NotFoundException when bid not found', async () => {
      // Arrange
      bidRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('Bid not found'),
      );
    });
  });

  describe('findByBidderId', () => {
    it('should return bids for specific bidder', async () => {
      // Arrange
      bidRepository.find.mockResolvedValue([mockBid]);

      // Act
      const result = await service.findByBidderId('bidder-1');

      // Assert
      expect(bidRepository.find).toHaveBeenCalledWith({
        where: { bidderId: 'bidder-1' },
        relations: ['auction', 'auction.item', 'bidder'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockBid.id);
    });
  });

  describe('findByAuctionId', () => {
    it('should return bids for specific auction', async () => {
      // Arrange
      bidRepository.find.mockResolvedValue([mockBid]);

      // Act
      const result = await service.findByAuctionId('auction-1');

      // Assert
      expect(bidRepository.find).toHaveBeenCalledWith({
        where: { auctionId: 'auction-1' },
        relations: ['auction', 'auction.item', 'bidder'],
        order: { amount: 'DESC', createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockBid.id);
    });
  });

  describe('getHighestBidForAuction', () => {
    it('should return highest bid when found', async () => {
      // Arrange
      bidRepository.findOne.mockResolvedValue(mockBid);

      // Act
      const result = await service.getHighestBidForAuction('auction-1');

      // Assert
      expect(bidRepository.findOne).toHaveBeenCalledWith({
        where: { auctionId: 'auction-1' },
        relations: ['auction', 'auction.item', 'bidder'],
        order: { amount: 'DESC' },
      });
      expect(result).toBeDefined();
      expect(result?.id).toBe(mockBid.id);
    });

    it('should return null when no bids found', async () => {
      // Arrange
      bidRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getHighestBidForAuction('auction-1');

      // Assert
      expect(result).toBeNull();
    });
  });
});