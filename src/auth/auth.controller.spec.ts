import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';
import { UserRole } from '../database/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthResponseDto: AuthResponseDto = {
    access_token: 'jwt-token',
    user: {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: UserRole.USER,
      createdAt: new Date(),
    },
  };

  const mockRegisterDto: RegisterDto = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
  };

  const mockLoginDto: LoginDto = {
    email: 'test@example.com',
    password: 'password123',
  };

  const mockUser = {
    id: '1',
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
      getUserById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      authService.register.mockResolvedValue(mockAuthResponseDto);

      // Act
      const result = await controller.register(mockRegisterDto);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(mockRegisterDto);
      expect(result).toEqual(mockAuthResponseDto);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const error = new Error('Registration failed');
      authService.register.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.register(mockRegisterDto)).rejects.toThrow(error);
      expect(authService.register).toHaveBeenCalledWith(mockRegisterDto);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      // Arrange
      authService.login.mockResolvedValue(mockAuthResponseDto);

      // Act
      const result = await controller.login(mockLoginDto);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(mockLoginDto);
      expect(result).toEqual(mockAuthResponseDto);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const error = new Error('Login failed');
      authService.login.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.login(mockLoginDto)).rejects.toThrow(error);
      expect(authService.login).toHaveBeenCalledWith(mockLoginDto);
    });
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      // Arrange
      const mockRequest = {
        user: { id: '1' },
      };
      authService.getUserById.mockResolvedValue(mockUser as any);

      // Act
      const result = await controller.getProfile(mockRequest);

      // Assert
      expect(authService.getUserById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockUser);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const mockRequest = {
        user: { id: '1' },
      };
      const error = new Error('User not found');
      authService.getUserById.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getProfile(mockRequest)).rejects.toThrow(error);
      expect(authService.getUserById).toHaveBeenCalledWith('1');
    });
  });
});