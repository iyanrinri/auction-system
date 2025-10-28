import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { User, UserRole } from '../src/database/entities/user.entity';
import { Item } from '../src/database/entities/item.entity';
import { Auction, AuctionStatus } from '../src/database/entities/auction.entity';
import { Bid } from '../src/database/entities/bid.entity';

/**
 * Test utility functions for creating mock data and repositories
 */
export class TestHelpers {
  /**
   * Create a mock repository with common methods
   */
  static createMockRepository<T extends ObjectLiteral>(): Partial<Repository<T>> {
    const mockQueryBuilder = this.createMockQueryBuilder();
    
    return {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findAndCount: jest.fn(),
      findBy: jest.fn(),
      exist: jest.fn(),
      merge: jest.fn(),
      preload: jest.fn(),
    };
  }

  /**
   * Create a mock user with default values
   */
  static createMockUser(overrides: Partial<User> = {}): User {
    return {
      id: 'user-1',
      email: 'test@example.com',
      password: 'hashedPassword',
      name: 'Test User',
      role: UserRole.USER,
      createdAt: new Date('2025-10-28T10:00:00.000Z'),
      modifiedAt: new Date('2025-10-28T10:00:00.000Z'),
      items: [],
      bids: [],
      watchlists: [],
      payments: [],
      ...overrides,
    };
  }

  /**
   * Create a mock seller user
   */
  static createMockSeller(overrides: Partial<User> = {}): User {
    return this.createMockUser({
      id: 'seller-1',
      email: 'seller@example.com',
      name: 'Test Seller',
      role: UserRole.SELLER,
      ...overrides,
    });
  }

  /**
   * Create a mock admin user
   */
  static createMockAdmin(overrides: Partial<User> = {}): User {
    return this.createMockUser({
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Test Admin',
      role: UserRole.ADMIN,
      ...overrides,
    });
  }

  /**
   * Create a mock item with default values
   */
  static createMockItem(overrides: Partial<Item> = {}): Item {
    const seller = this.createMockSeller();
    return {
      id: 'item-1',
      sellerId: seller.id,
      title: 'Test Item',
      description: 'Test Description',
      metadata: { category: 'electronics' },
      createdAt: new Date('2025-10-28T10:00:00.000Z'),
      modifiedAt: new Date('2025-10-28T10:00:00.000Z'),
      seller,
      auction: null,
      ...overrides,
    };
  }

  /**
   * Create a mock auction with default values
   */
  static createMockAuction(overrides: Partial<Auction> = {}): Auction {
    const item = this.createMockItem();
    return {
      id: 'auction-1',
      itemId: item.id,
      startingPrice: 100,
      reservePrice: 200,
      buyNowPrice: 500,
      minIncrement: 10,
      startAt: new Date('2025-10-28T09:00:00.000Z'),
      endAt: new Date('2025-10-28T18:00:00.000Z'),
      status: AuctionStatus.RUNNING,
      autoExtendSeconds: 300,
      createdAt: new Date('2025-10-28T10:00:00.000Z'),
      modifiedAt: new Date('2025-10-28T10:00:00.000Z'),
      item,
      bids: [],
      payments: [],
      watchlists: [],
      ...overrides,
    };
  }

  /**
   * Create a mock bid with default values
   */
  static createMockBid(overrides: Partial<Bid> = {}): Bid {
    const auction = this.createMockAuction();
    const bidder = this.createMockUser();
    return {
      id: 'bid-1',
      auctionId: auction.id,
      bidderId: bidder.id,
      amount: 150,
      isAuto: false,
      createdAt: new Date('2025-10-28T10:00:00.000Z'),
      modifiedAt: new Date('2025-10-28T10:00:00.000Z'),
      auction,
      bidder,
      ...overrides,
    };
  }

  /**
   * Create a test module with mocked repositories
   */
  static async createTestModule(
    providers: any[],
    repositories: { entity: any; token?: string }[] = []
  ): Promise<TestingModule> {
    const testProviders = [...providers];

    // Add mock repositories
    repositories.forEach(({ entity, token }) => {
      testProviders.push({
        provide: token || getRepositoryToken(entity),
        useValue: this.createMockRepository(),
      });
    });

    return Test.createTestingModule({
      providers: testProviders,
    }).compile();
  }

  /**
   * Wait for a specified amount of time (useful for async operations)
   */
  static async wait(ms: number = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a promise that can be resolved externally
   */
  static createDeferredPromise<T = void>(): {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
  } {
    let resolve: (value: T | PromiseLike<T>) => void;
    let reject: (reason?: any) => void;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve: resolve!, reject: reject! };
  }

  /**
   * Mock console methods for testing
   */
  static mockConsole(): {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
    info: jest.SpyInstance;
    debug: jest.SpyInstance;
  } {
    return {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation(),
    };
  }

  /**
   * Create mock query builder for TypeORM
   */
  static createMockQueryBuilder(): any {
    return {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      andHaving: jest.fn().mockReturnThis(),
      orHaving: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
      getOne: jest.fn(),
      getMany: jest.fn(),
      getCount: jest.fn(),
      getManyAndCount: jest.fn(),
      execute: jest.fn(),
      stream: jest.fn(),
      clone: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orUpdate: jest.fn().mockReturnThis(),
      onConflict: jest.fn().mockReturnThis(),
    };
  }
}