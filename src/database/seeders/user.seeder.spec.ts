import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UserSeeder } from './user.seeder';
import { User, UserRole } from '../entities/user.entity';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserSeeder', () => {
  let userSeeder: UserSeeder;
  let dataSource: jest.Mocked<DataSource>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockAdmin: User = {
    id: '1',
    email: 'admin@auction.com',
    password: 'hashedPassword',
    name: 'System Administrator',
    role: UserRole.ADMIN,
    createdAt: new Date(),
    modifiedAt: new Date(),
    items: [],
    bids: [],
    watchlists: [],
    payments: [],
  };

  const mockSeller: User = {
    id: '2',
    email: 'seller@auction.com',
    password: 'hashedPassword',
    name: 'Demo Seller',
    role: UserRole.SELLER,
    createdAt: new Date(),
    modifiedAt: new Date(),
    items: [],
    bids: [],
    watchlists: [],
    payments: [],
  };

  const mockUser: User = {
    id: '3',
    email: 'user@auction.com',
    password: 'hashedPassword',
    name: 'Demo User',
    role: UserRole.USER,
    createdAt: new Date(),
    modifiedAt: new Date(),
    items: [],
    bids: [],
    watchlists: [],
    payments: [],
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockUserRepository),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSeeder,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    userSeeder = module.get<UserSeeder>(UserSeeder);
    dataSource = module.get(DataSource);
    userRepository = dataSource.getRepository(User) as jest.Mocked<Repository<User>>;

    // Mock console.log to avoid output during tests
    jest.spyOn(console, 'log').mockImplementation();

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(userSeeder).toBeDefined();
  });

  describe('run', () => {
    it('should create all users when none exist', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null); // No existing users
      userRepository.create.mockReturnValueOnce(mockAdmin);
      userRepository.create.mockReturnValueOnce(mockSeller);
      userRepository.create.mockReturnValueOnce(mockUser);
      userRepository.save.mockResolvedValue({} as User);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);

      // Act
      await userSeeder.run();

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledTimes(3);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@auction.com' },
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'seller@auction.com' },
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'user@auction.com' },
      });
      
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(3);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('admin123', 10);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('seller123', 10);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('user123', 10);

      expect(userRepository.create).toHaveBeenCalledTimes(3);
      expect(userRepository.create).toHaveBeenCalledWith({
        email: 'admin@auction.com',
        password: 'hashedPassword',
        name: 'System Administrator',
        role: UserRole.ADMIN,
      });
      expect(userRepository.create).toHaveBeenCalledWith({
        email: 'seller@auction.com',
        password: 'hashedPassword',
        name: 'Demo Seller',
        role: UserRole.SELLER,
      });
      expect(userRepository.create).toHaveBeenCalledWith({
        email: 'user@auction.com',
        password: 'hashedPassword',
        name: 'Demo User',
        role: UserRole.USER,
      });

      expect(userRepository.save).toHaveBeenCalledTimes(3);
      expect(console.log).toHaveBeenCalledWith('✅ Admin user created');
      expect(console.log).toHaveBeenCalledWith('✅ Seller user created');
      expect(console.log).toHaveBeenCalledWith('✅ Regular user created');
    });

    it('should skip creating users that already exist', async () => {
      // Arrange
      userRepository.findOne.mockImplementation((options: any) => {
        const email = options.where.email;
        if (email === 'admin@auction.com') return Promise.resolve(mockAdmin);
        if (email === 'seller@auction.com') return Promise.resolve(mockSeller);
        if (email === 'user@auction.com') return Promise.resolve(mockUser);
        return Promise.resolve(null);
      });

      // Act
      await userSeeder.run();

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledTimes(3);
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalledWith('✅ Admin user created');
      expect(console.log).not.toHaveBeenCalledWith('✅ Seller user created');
      expect(console.log).not.toHaveBeenCalledWith('✅ Regular user created');
    });

    it('should create only non-existing users', async () => {
      // Arrange
      userRepository.findOne.mockImplementation((options: any) => {
        const email = options.where.email;
        if (email === 'admin@auction.com') return Promise.resolve(mockAdmin); // exists
        return Promise.resolve(null); // others don't exist
      });
      userRepository.create.mockReturnValueOnce(mockSeller);
      userRepository.create.mockReturnValueOnce(mockUser);
      userRepository.save.mockResolvedValue({} as User);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);

      // Act
      await userSeeder.run();

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledTimes(3);
      expect(userRepository.create).toHaveBeenCalledTimes(2); // Only seller and user
      expect(userRepository.save).toHaveBeenCalledTimes(2);
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(2);
      
      expect(console.log).not.toHaveBeenCalledWith('✅ Admin user created');
      expect(console.log).toHaveBeenCalledWith('✅ Seller user created');
      expect(console.log).toHaveBeenCalledWith('✅ Regular user created');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      userRepository.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(userSeeder.run()).rejects.toThrow(error);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@auction.com' },
      });
    });

    it('should handle password hashing errors', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);
      const hashError = new Error('Hashing failed');
      mockedBcrypt.hash.mockRejectedValue(hashError as never);

      // Act & Assert
      await expect(userSeeder.run()).rejects.toThrow(hashError);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@auction.com' },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('admin123', 10);
    });

    it('should handle user creation errors', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      userRepository.create.mockReturnValue(mockAdmin);
      const saveError = new Error('Save failed');
      userRepository.save.mockRejectedValue(saveError);

      // Act & Assert
      await expect(userSeeder.run()).rejects.toThrow(saveError);
      expect(userRepository.create).toHaveBeenCalledWith({
        email: 'admin@auction.com',
        password: 'hashedPassword',
        name: 'System Administrator',
        role: UserRole.ADMIN,
      });
      expect(userRepository.save).toHaveBeenCalledWith(mockAdmin);
    });
  });
});