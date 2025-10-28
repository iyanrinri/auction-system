import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { User, UserRole } from '../../database/entities/user.entity';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: jest.Mocked<Repository<User>>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword',
    name: 'Test User',
    role: UserRole.USER,
    createdAt: new Date(),
    modifiedAt: new Date(),
    items: [],
    bids: [],
    watchlists: [],
    payments: [],
  };

  const mockJwtPayload: JwtPayload = {
    sub: '1',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userRepository = module.get(getRepositoryToken(User));
    configService = module.get(ConfigService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user when valid payload is provided', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(mockJwtPayload);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockJwtPayload.sub },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw error when user is not found', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(mockJwtPayload)).rejects.toThrow('User not found');
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockJwtPayload.sub },
      });
    });
  });
});