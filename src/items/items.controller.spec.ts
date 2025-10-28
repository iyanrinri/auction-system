import { Test, TestingModule } from '@nestjs/testing';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { GetItemsQueryDto } from './dto/get-items-query.dto';
import { ItemResponseDto, PaginatedItemsResponseDto } from './dto/item-response.dto';
import { UserRole } from '../database/entities/user.entity';

describe('ItemsController', () => {
  let controller: ItemsController;
  let itemsService: jest.Mocked<ItemsService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.SELLER,
  };

  const mockItemResponse: ItemResponseDto = {
    id: 'item-1',
    sellerId: 'user-1',
    title: 'Test Item',
    description: 'Test Description',
    metadata: { category: 'electronics', color: 'black' },
    createdAt: new Date(),
    modifiedAt: new Date(),
    seller: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: UserRole.SELLER,
    },
    auction: undefined,
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

  const mockPaginatedResponse: PaginatedItemsResponseDto = {
    items: [mockItemResponse],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  beforeEach(async () => {
    const mockItemsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByIds: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findBySellerId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItemsController],
      providers: [
        {
          provide: ItemsService,
          useValue: mockItemsService,
        },
      ],
    }).compile();

    controller = module.get<ItemsController>(ItemsController);
    itemsService = module.get(ItemsService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create item successfully', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      itemsService.create.mockResolvedValue(mockItemResponse);

      // Act
      const result = await controller.create(mockCreateItemDto, mockRequest);

      // Assert
      expect(itemsService.create).toHaveBeenCalledWith(mockCreateItemDto, mockUser.id);
      expect(result).toEqual(mockItemResponse);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      const error = new Error('Creation failed');
      itemsService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(mockCreateItemDto, mockRequest)).rejects.toThrow(error);
      expect(itemsService.create).toHaveBeenCalledWith(mockCreateItemDto, mockUser.id);
    });
  });

  describe('findAll', () => {
    it('should return paginated items', async () => {
      // Arrange
      const query: GetItemsQueryDto = { page: 1, limit: 10 };
      itemsService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(itemsService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle empty query parameters', async () => {
      // Arrange
      const query: GetItemsQueryDto = {};
      itemsService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(itemsService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle search and filter parameters', async () => {
      // Arrange
      const query: GetItemsQueryDto = {
        q: 'test',
        sellerId: 'seller-1',
        page: 2,
        limit: 5,
        sortBy: 'title',
        sortOrder: 'ASC',
      };
      itemsService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(itemsService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('findMyItems', () => {
    it('should return user\'s items', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      const myItems = [mockItemResponse];
      itemsService.findBySellerId.mockResolvedValue(myItems);

      // Act
      const result = await controller.findMyItems(mockRequest);

      // Assert
      expect(itemsService.findBySellerId).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(myItems);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      const error = new Error('Failed to find items');
      itemsService.findBySellerId.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findMyItems(mockRequest)).rejects.toThrow(error);
      expect(itemsService.findBySellerId).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('findOne', () => {
    it('should return item by ID', async () => {
      // Arrange
      const itemId = 'item-1';
      itemsService.findOne.mockResolvedValue(mockItemResponse);

      // Act
      const result = await controller.findOne(itemId);

      // Assert
      expect(itemsService.findOne).toHaveBeenCalledWith(itemId);
      expect(result).toEqual(mockItemResponse);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const itemId = 'non-existent-id';
      const error = new Error('Item not found');
      itemsService.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findOne(itemId)).rejects.toThrow(error);
      expect(itemsService.findOne).toHaveBeenCalledWith(itemId);
    });
  });

  describe('update', () => {
    it('should update item successfully', async () => {
      // Arrange
      const itemId = 'item-1';
      const mockRequest = { user: mockUser };
      const updatedItem = { ...mockItemResponse, title: 'Updated Item' };
      itemsService.update.mockResolvedValue(updatedItem);

      // Act
      const result = await controller.update(itemId, mockUpdateItemDto, mockRequest);

      // Assert
      expect(itemsService.update).toHaveBeenCalledWith(itemId, mockUpdateItemDto, mockUser);
      expect(result).toEqual(updatedItem);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const itemId = 'item-1';
      const mockRequest = { user: mockUser };
      const error = new Error('Update failed');
      itemsService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(itemId, mockUpdateItemDto, mockRequest)).rejects.toThrow(error);
      expect(itemsService.update).toHaveBeenCalledWith(itemId, mockUpdateItemDto, mockUser);
    });
  });

  describe('remove', () => {
    it('should remove item successfully', async () => {
      // Arrange
      const itemId = 'item-1';
      const mockRequest = { user: mockUser };
      itemsService.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(itemId, mockRequest);

      // Assert
      expect(itemsService.remove).toHaveBeenCalledWith(itemId, mockUser);
      expect(result).toBeUndefined();
    });

    it('should propagate service errors', async () => {
      // Arrange
      const itemId = 'item-1';
      const mockRequest = { user: mockUser };
      const error = new Error('Delete failed');
      itemsService.remove.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.remove(itemId, mockRequest)).rejects.toThrow(error);
      expect(itemsService.remove).toHaveBeenCalledWith(itemId, mockUser);
    });
  });
});