import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../database/entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      validateUser: jest.fn(),
      getUserById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    authService = module.get(AuthService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCurrentUser', () => {
    it('should return current user details', async () => {
      // Arrange
      const mockRequest = { user: { id: 'user-1' } };
      authService.getUserById.mockResolvedValue(mockUser as any);

      // Act
      const result = await controller.getCurrentUser(mockRequest);

      // Assert
      expect(authService.getUserById).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockUser);
    });

    it('should propagate service errors when user not found', async () => {
      // Arrange
      const mockRequest = { user: { id: 'non-existent-user' } };
      const error = new Error('User not found');
      authService.getUserById.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getCurrentUser(mockRequest)).rejects.toThrow(error);
      expect(authService.getUserById).toHaveBeenCalledWith('non-existent-user');
    });

    it('should handle different user roles', async () => {
      // Arrange
      const sellerUser = { ...mockUser, role: UserRole.SELLER };
      const adminUser = { ...mockUser, role: UserRole.ADMIN };

      // Test seller user
      const sellerRequest = { user: { id: 'seller-1' } };
      authService.getUserById.mockResolvedValueOnce(sellerUser as any);
      
      const sellerResult = await controller.getCurrentUser(sellerRequest);
      expect(sellerResult.role).toBe(UserRole.SELLER);

      // Test admin user
      const adminRequest = { user: { id: 'admin-1' } };
      authService.getUserById.mockResolvedValueOnce(adminUser as any);
      
      const adminResult = await controller.getCurrentUser(adminRequest);
      expect(adminResult.role).toBe(UserRole.ADMIN);
    });

    it('should return user details without password', async () => {
      // Arrange
      const mockRequest = { user: { id: 'user-1' } };
      const userWithoutPassword = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        createdAt: new Date(),
        modifiedAt: new Date(),
      };
      authService.getUserById.mockResolvedValue(userWithoutPassword as any);

      // Act
      const result = await controller.getCurrentUser(mockRequest);

      // Assert
      expect(result).not.toHaveProperty('password');
      expect(result).toEqual(userWithoutPassword);
    });
  });
});