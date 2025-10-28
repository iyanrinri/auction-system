import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SeederService } from './seeder.service';
import { UserSeeder } from './user.seeder';
import { ItemSeeder } from './item.seeder';

describe('SeederService', () => {
  let seederService: SeederService;
  let userSeeder: jest.Mocked<UserSeeder>;
  let itemSeeder: jest.Mocked<ItemSeeder>;

  beforeEach(async () => {
    const mockUserSeeder = {
      run: jest.fn(),
    };

    const mockItemSeeder = {
      run: jest.fn(),
    };

    const mockDataSource = {
      getRepository: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeederService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: UserSeeder,
          useValue: mockUserSeeder,
        },
        {
          provide: ItemSeeder,
          useValue: mockItemSeeder,
        },
      ],
    }).compile();

    seederService = module.get<SeederService>(SeederService);
    userSeeder = module.get(UserSeeder);
    itemSeeder = module.get(ItemSeeder);

    // Mock console methods to avoid output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(seederService).toBeDefined();
  });

  describe('runAllSeeders', () => {
    it('should run all seeders successfully in correct order', async () => {
      // Arrange
      userSeeder.run.mockResolvedValue();
      itemSeeder.run.mockResolvedValue();

      // Act
      await seederService.runAllSeeders();

      // Assert
      expect(console.log).toHaveBeenCalledWith('🌱 Starting database seeding...');
      expect(userSeeder.run).toHaveBeenCalled();
      expect(itemSeeder.run).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('🎉 Database seeding completed successfully!');

      // Check order of execution
      const userSeederCallOrder = userSeeder.run.mock.invocationCallOrder[0];
      const itemSeederCallOrder = itemSeeder.run.mock.invocationCallOrder[0];
      expect(userSeederCallOrder).toBeLessThan(itemSeederCallOrder);
    });

    it('should handle errors from user seeder', async () => {
      // Arrange
      const error = new Error('User seeder failed');
      userSeeder.run.mockRejectedValue(error);
      itemSeeder.run.mockResolvedValue();

      // Act & Assert
      await expect(seederService.runAllSeeders()).rejects.toThrow(error);
      expect(console.log).toHaveBeenCalledWith('🌱 Starting database seeding...');
      expect(userSeeder.run).toHaveBeenCalled();
      expect(itemSeeder.run).not.toHaveBeenCalled(); // Should not be called due to error
      expect(console.error).toHaveBeenCalledWith('❌ Database seeding failed:', error);
      expect(console.log).not.toHaveBeenCalledWith('🎉 Database seeding completed successfully!');
    });

    it('should handle errors from item seeder', async () => {
      // Arrange
      const error = new Error('Item seeder failed');
      userSeeder.run.mockResolvedValue();
      itemSeeder.run.mockRejectedValue(error);

      // Act & Assert
      await expect(seederService.runAllSeeders()).rejects.toThrow(error);
      expect(console.log).toHaveBeenCalledWith('🌱 Starting database seeding...');
      expect(userSeeder.run).toHaveBeenCalled();
      expect(itemSeeder.run).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('❌ Database seeding failed:', error);
      expect(console.log).not.toHaveBeenCalledWith('🎉 Database seeding completed successfully!');
    });

    it('should propagate seeder errors to caller', async () => {
      // Arrange
      const originalError = new Error('Database connection lost');
      userSeeder.run.mockRejectedValue(originalError);

      // Act & Assert
      await expect(seederService.runAllSeeders()).rejects.toBe(originalError);
      expect(console.error).toHaveBeenCalledWith('❌ Database seeding failed:', originalError);
    });

    it('should complete successfully when all seeders pass', async () => {
      // Arrange
      userSeeder.run.mockResolvedValue();
      itemSeeder.run.mockResolvedValue();

      // Act
      const result = seederService.runAllSeeders();

      // Assert
      await expect(result).resolves.toBeUndefined();
      expect(userSeeder.run).toHaveBeenCalledTimes(1);
      expect(itemSeeder.run).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith('🎉 Database seeding completed successfully!');
    });

    it('should handle timing of seeder execution', async () => {
      // Arrange
      let userSeederResolve: () => void;
      let itemSeederResolve: () => void;

      const userSeederPromise = new Promise<void>((resolve) => {
        userSeederResolve = resolve;
      });
      const itemSeederPromise = new Promise<void>((resolve) => {
        itemSeederResolve = resolve;
      });

      userSeeder.run.mockReturnValue(userSeederPromise);
      itemSeeder.run.mockReturnValue(itemSeederPromise);

      // Act
      const seederPromise = seederService.runAllSeeders();

      // Verify user seeder is called but not item seeder yet
      expect(userSeeder.run).toHaveBeenCalled();
      expect(itemSeeder.run).not.toHaveBeenCalled();

      // Resolve user seeder
      userSeederResolve!();
      await userSeederPromise;

      // Now item seeder should be called
      expect(itemSeeder.run).toHaveBeenCalled();

      // Resolve item seeder
      itemSeederResolve!();
      await itemSeederPromise;

      // Wait for completion
      await seederPromise;

      // Assert
      expect(console.log).toHaveBeenCalledWith('🎉 Database seeding completed successfully!');
    });
  });
});