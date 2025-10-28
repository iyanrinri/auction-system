import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { Item } from '../database/entities/item.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { Auction, AuctionStatus } from '../database/entities/auction.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { GetItemsQueryDto } from './dto/get-items-query.dto';

describe('ItemsService', () => {
  let service: ItemsService;
  let itemRepository: jest.Mocked<Repository<Item>>;

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
    metadata: { category: 'electronics', color: 'black' },
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
    startAt: new Date(),
    endAt: new Date(),
    status: AuctionStatus.SCHEDULED,
    autoExtendSeconds: 300,
    createdAt: new Date(),
    modifiedAt: new Date(),
    item: mockItem,
    bids: [],
    payments: [],
    watchlists: [],
  };

  const mockCreateItemDto: CreateItemDto = {
    title: 'Test Item',
    description: 'Test Description',
    metadata: { category: 'electronics', color: 'black' },
  };

  const mockUpdateItemDto: UpdateItemDto = {
    title: 'Updated Item',
    description: 'Updated Description',
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
  };

  beforeEach(async () => {
    const mockItemRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        {
          provide: getRepositoryToken(Item),
          useValue: mockItemRepository,
        },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
    itemRepository = module.get(getRepositoryToken(Item));

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create item successfully', async () => {
      // Arrange
      itemRepository.create.mockReturnValue(mockItem);
      itemRepository.save.mockResolvedValue(mockItem);
      
      // Mock findOne to return complete item response
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: mockItem.id,
        sellerId: mockItem.sellerId,
        title: mockItem.title,
        description: mockItem.description,
        metadata: mockItem.metadata,
        createdAt: mockItem.createdAt,
        modifiedAt: mockItem.modifiedAt,
        seller: {
          id: mockSeller.id,
          email: mockSeller.email,
          name: mockSeller.name,
          role: mockSeller.role,
        },
        auction: undefined,
      });

      // Act
      const result = await service.create(mockCreateItemDto, 'seller-1');

      // Assert
      expect(itemRepository.create).toHaveBeenCalledWith({
        ...mockCreateItemDto,
        sellerId: 'seller-1',
      });
      expect(itemRepository.save).toHaveBeenCalledWith(mockItem);
      expect(result).toBeDefined();
      expect(result.id).toBe(mockItem.id);
      expect(result.title).toBe(mockItem.title);
    });
  });

  describe('findAll', () => {
    it('should return paginated items', async () => {
      // Arrange
      const queryDto: GetItemsQueryDto = { page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockItem], 1]);

      // Act
      const result = await service.findAll(queryDto);

      // Assert
      expect(result).toEqual({
        items: expect.any(Array),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.items).toHaveLength(1);
    });

    it('should apply search filter when q is provided', async () => {
      // Arrange
      const queryDto: GetItemsQueryDto = { q: 'test', page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.findAll(queryDto);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(item.title) LIKE LOWER(:search) OR LOWER(item.description) LIKE LOWER(:search))',
        { search: '%test%' },
      );
    });

    it('should apply seller filter when sellerId is provided', async () => {
      // Arrange
      const queryDto: GetItemsQueryDto = { sellerId: 'seller-1', page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.findAll(queryDto);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.sellerId = :sellerId',
        { sellerId: 'seller-1' },
      );
    });

    it('should apply custom sorting', async () => {
      // Arrange
      const queryDto: GetItemsQueryDto = { 
        page: 1, 
        limit: 10, 
        sortBy: 'title', 
        sortOrder: 'ASC' 
      };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.findAll(queryDto);

      // Assert
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('item.title', 'ASC');
    });
  });

  describe('findOne', () => {
    it('should return item when found', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(mockItem);

      // Act
      const result = await service.findOne('item-1');

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.id = :id',
        { id: 'item-1' },
      );
      expect(result).toBeDefined();
      expect(result.id).toBe(mockItem.id);
      expect(result.title).toBe(mockItem.title);
    });

    it('should throw NotFoundException when item not found', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('Item with ID non-existent-id not found'),
      );
    });
  });

  describe('findByIds', () => {
    it('should return items for given IDs', async () => {
      // Arrange
      const ids = ['item-1', 'item-2'];
      mockQueryBuilder.getMany.mockResolvedValue([mockItem]);

      // Act
      const result = await service.findByIds(ids);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.id IN (:...ids)',
        { ids },
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockItem.id);
    });

    it('should return empty array when no IDs provided', async () => {
      // Act
      const result = await service.findByIds([]);

      // Assert
      expect(result).toEqual([]);
      expect(mockQueryBuilder.getMany).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update item successfully', async () => {
      // Arrange
      itemRepository.findOne.mockResolvedValueOnce(mockItem); // for permission check
      itemRepository.findOne.mockResolvedValueOnce(mockItem); // for auction check
      itemRepository.update.mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: mockItem.id,
        sellerId: mockItem.sellerId,
        title: 'Updated Item',
        description: 'Updated Description',
        metadata: mockItem.metadata,
        createdAt: mockItem.createdAt,
        modifiedAt: mockItem.modifiedAt,
        seller: {
          id: mockSeller.id,
          email: mockSeller.email,
          name: mockSeller.name,
          role: mockSeller.role,
        },
        auction: undefined,
      });

      // Act
      const result = await service.update('item-1', mockUpdateItemDto, mockSeller);

      // Assert
      expect(itemRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        relations: ['seller'],
      });
      expect(itemRepository.update).toHaveBeenCalledWith('item-1', mockUpdateItemDto);
      expect(result.title).toBe('Updated Item');
    });

    it('should throw NotFoundException when item not found', async () => {
      // Arrange
      itemRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('non-existent-id', mockUpdateItemDto, mockSeller)).rejects.toThrow(
        new NotFoundException('Item with ID non-existent-id not found'),
      );
    });

    it('should throw ForbiddenException when user is not owner or admin', async () => {
      // Arrange
      const differentUser = { ...mockSeller, id: 'different-user', role: UserRole.USER };
      itemRepository.findOne.mockResolvedValue(mockItem);

      // Act & Assert
      await expect(service.update('item-1', mockUpdateItemDto, differentUser)).rejects.toThrow(
        new ForbiddenException('You can only update your own items'),
      );
    });

    it('should throw BadRequestException when item has auction', async () => {
      // Arrange
      itemRepository.findOne.mockResolvedValueOnce(mockItem); // for permission check
      const itemWithAuction = { ...mockItem, auction: mockAuction };
      itemRepository.findOne.mockResolvedValueOnce(itemWithAuction); // for auction check

      // Act & Assert
      await expect(service.update('item-1', mockUpdateItemDto, mockSeller)).rejects.toThrow(
        new BadRequestException('Cannot update item that already has an auction'),
      );
    });

    it('should allow admin to update any item', async () => {
      // Arrange
      const adminUser = { ...mockSeller, id: 'admin-1', role: UserRole.ADMIN };
      itemRepository.findOne.mockResolvedValueOnce(mockItem); // for permission check
      itemRepository.findOne.mockResolvedValueOnce(mockItem); // for auction check
      itemRepository.update.mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(service, 'findOne').mockResolvedValue({} as any);

      // Act
      await service.update('item-1', mockUpdateItemDto, adminUser);

      // Assert
      expect(itemRepository.update).toHaveBeenCalledWith('item-1', mockUpdateItemDto);
    });
  });

  describe('remove', () => {
    it('should remove item successfully', async () => {
      // Arrange
      itemRepository.findOne.mockResolvedValue(mockItem);
      itemRepository.remove.mockResolvedValue(mockItem);

      // Act
      await service.remove('item-1', mockSeller);

      // Assert
      expect(itemRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        relations: ['seller', 'auction'],
      });
      expect(itemRepository.remove).toHaveBeenCalledWith(mockItem);
    });

    it('should throw NotFoundException when item not found', async () => {
      // Arrange
      itemRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent-id', mockSeller)).rejects.toThrow(
        new NotFoundException('Item with ID non-existent-id not found'),
      );
    });

    it('should throw ForbiddenException when user is not owner or admin', async () => {
      // Arrange
      const differentUser = { ...mockSeller, id: 'different-user', role: UserRole.USER };
      itemRepository.findOne.mockResolvedValue(mockItem);

      // Act & Assert
      await expect(service.remove('item-1', differentUser)).rejects.toThrow(
        new ForbiddenException('You can only delete your own items'),
      );
    });

    it('should throw BadRequestException when item has auction', async () => {
      // Arrange
      const itemWithAuction = { ...mockItem, auction: mockAuction };
      itemRepository.findOne.mockResolvedValue(itemWithAuction);

      // Act & Assert
      await expect(service.remove('item-1', mockSeller)).rejects.toThrow(
        new BadRequestException('Cannot delete item that has an auction'),
      );
    });

    it('should allow admin to delete any item', async () => {
      // Arrange
      const adminUser = { ...mockSeller, id: 'admin-1', role: UserRole.ADMIN };
      itemRepository.findOne.mockResolvedValue(mockItem);
      itemRepository.remove.mockResolvedValue(mockItem);

      // Act
      await service.remove('item-1', adminUser);

      // Assert
      expect(itemRepository.remove).toHaveBeenCalledWith(mockItem);
    });
  });

  describe('findBySellerId', () => {
    it('should return items for specific seller', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockItem]);

      // Act
      const result = await service.findBySellerId('seller-1');

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.sellerId = :sellerId',
        { sellerId: 'seller-1' },
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockItem.id);
    });
  });
});