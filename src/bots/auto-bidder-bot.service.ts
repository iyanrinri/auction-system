import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../database/entities/user.entity';
import { Auction, AuctionStatus } from '../database/entities/auction.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AutoBidderBotService implements OnModuleDestroy {
  private readonly logger = new Logger(AutoBidderBotService.name);
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private botUsers: User[] = [];
  private readonly API_BASE_URL = `http://localhost:${process.env.PORT ?? 3000}`;
  private userTokens: Map<string, string> = new Map();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Auction)
    private readonly auctionRepository: Repository<Auction>,
    private readonly httpService: HttpService,
  ) {}

  async onModuleDestroy() {
    this.stop();
  }

  /**
   * Start the auto-bidder bot
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Bot is already running');
      return;
    }

    // Fetch 3 users with role 'user' ordered by created_at
    this.botUsers = await this.userRepository.find({
      where: { role: UserRole.USER },
      order: { createdAt: 'ASC' },
      take: 3,
    });

    if (this.botUsers.length === 0) {
      this.logger.error('No users found with role "user". Cannot start bot.');
      return;
    }

    this.logger.log(`Bot initialized with ${this.botUsers.length} users:`);
    this.botUsers.forEach((user, index) => {
      this.logger.log(`  ${index + 1}. ${user.email} (ID: ${user.id})`);
    });

    // Login all bot users to get their JWT tokens
    await this.loginBotUsers();

    this.isRunning = true;
    this.logger.log('🤖 Auto-bidder bot started. Will place bids every 3 seconds...');

    // Place bid immediately, then every 3 seconds
    this.placeBid();
    this.intervalId = setInterval(() => {
      this.placeBid();
    }, 3000);
  }

  /**
   * Stop the auto-bidder bot
   */
  stop(): void {
    if (!this.isRunning) {
      this.logger.warn('Bot is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    this.botUsers = [];
    this.userTokens.clear();
    this.logger.log('🛑 Auto-bidder bot stopped');
  }

  /**
   * Get bot status
   */
  getStatus(): {
    isRunning: boolean;
    botUsers: { id: string; email: string; name?: string }[];
  } {
    return {
      isRunning: this.isRunning,
      botUsers: this.botUsers.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
      })),
    };
  }

  /**
   * Login all bot users to get JWT tokens
   */
  private async loginBotUsers(): Promise<void> {
    for (const user of this.botUsers) {
      try {
        // Determine password based on email pattern
        let password = 'password123'; // Default fallback
        
        if (user.email.includes('admin')) {
          password = 'admin123';
        } else if (user.email.includes('seller')) {
          password = 'seller123';
        } else if (user.email === 'user@auction.com') {
          password = 'user123';
        }
        // For other users (user@example.com, joni@example.com, etc.), use password123

        const response = await firstValueFrom(
          this.httpService.post<{ access_token: string }>(`${this.API_BASE_URL}/auth/login`, {
            email: user.email,
            password: password,
          }),
        );

        this.userTokens.set(user.id, response.data.access_token);
        // this.logger.log(`✅ Logged in user: ${user.email} (password: ${password})`);
      } catch (error: any) {
        this.logger.error(`❌ Failed to login user ${user.email}:`, error.message);
      }
    }
  }

  /**
   * Place a bid by hitting the API endpoint
   */
  private async placeBid(): Promise<void> {
    try {
      // Get a random running auction
      const runningAuctions = await this.auctionRepository.find({
        where: { status: AuctionStatus.RUNNING },
        relations: ['item', 'bids'],
        order: { bids: { amount: 'DESC' } },
      });

      if (runningAuctions.length === 0) {
        this.logger.debug('No running auctions found. Skipping bid...');
        return;
      }

      // Select random auction
      const randomAuction =
        runningAuctions[Math.floor(Math.random() * runningAuctions.length)];

      // Select random bot user
      const randomUser =
        this.botUsers[Math.floor(Math.random() * this.botUsers.length)];

      const userToken = this.userTokens.get(randomUser.id);
      if (!userToken) {
        this.logger.error(`No token found for user ${randomUser.email}`);
        return;
      }

      // Calculate bid amount properly with minIncrement
      const currentHighestBid = randomAuction.bids?.[0]?.amount;
      const minIncrement = Number(randomAuction.minIncrement) || 10000;
      
      let minimumBid: number;
      if (currentHighestBid) {
        // There's already a bid, so minimum = highest + minIncrement
        minimumBid = Number(currentHighestBid) + minIncrement;
      } else {
        // No bid yet, so minimum = starting price
        minimumBid = Number(randomAuction.startingPrice);
      }

      // Add random extra increment (0 to 2x minIncrement)
      const extraIncrement = Math.floor(Math.random() * (minIncrement * 2));
      const bidAmount = minimumBid + extraIncrement;

      // Hit the API to place bid
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.API_BASE_URL}/bids`,
          {
            auctionId: randomAuction.id,
            amount: bidAmount,
          },
          {
            headers: {
              Authorization: `Bearer ${userToken}`,
            },
          },
        ),
      );

      this.logger.log(
        `✅ Bid placed: ${randomUser.email} bid Rp ${bidAmount.toLocaleString('id-ID')} on "${randomAuction.item.title}" (Auction ID: ${randomAuction.id})`,
      );
    } catch (error: any) {
      if (error.response?.status === 400) {
        this.logger.debug(`⚠️  Bid failed: ${error.response.data.message}`);
      } else if (error.response?.status === 403) {
        this.logger.debug(`⚠️  Bid forbidden: ${error.response.data.message}`);
      } else {
        this.logger.error(`❌ Error placing bid:`, error.message);
      }
    }
  }
}
