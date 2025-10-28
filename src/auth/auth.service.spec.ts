import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../database/entities/user.entity';
import { RegisterDto, LoginDto } from './dto';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;

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

  const mockRegisterDto: RegisterDto = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
  };

  const mockLoginDto: LoginDto = {
    email: 'test@example.com',
    password: 'password123',
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      jwtService.sign.mockReturnValue('jwt-token');

      // Act
      const result = await service.register(mockRegisterDto);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockRegisterDto.email },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(mockRegisterDto.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        email: mockRegisterDto.email,
        password: 'hashedPassword',
        name: mockRegisterDto.name,
        role: UserRole.USER,
      });
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      expect(result).toEqual({
        access_token: 'jwt-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          createdAt: mockUser.createdAt,
        },
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        new ConflictException('User with this email already exists'),
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockRegisterDto.email },
      });
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should successfully login a user with valid credentials', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('jwt-token');

      // Act
      const result = await service.login(mockLoginDto);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockLoginDto.email },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(mockLoginDto.password, mockUser.password);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      expect(result).toEqual({
        access_token: 'jwt-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          createdAt: mockUser.createdAt,
        },
      });
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockLoginDto.email },
      });
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act & Assert
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockLoginDto.email },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(mockLoginDto.password, mockUser.password);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('should return user if found', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateUser(mockUser.id);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw BadRequestException if user not found', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.validateUser('invalid-id')).rejects.toThrow(
        new BadRequestException('User not found'),
      );
    });
  });

  describe('getUserById', () => {
    it('should return user without password if found', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.getUserById(mockUser.id);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toEqual(expect.not.objectContaining({ password: mockUser.password }));
      expect(result.id).toEqual(mockUser.id);
      expect(result.email).toEqual(mockUser.email);
    });

    it('should throw BadRequestException if user not found', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUserById('invalid-id')).rejects.toThrow(
        new BadRequestException('User not found'),
      );
    });
  });
});