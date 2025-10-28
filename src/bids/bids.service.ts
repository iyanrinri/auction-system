import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { Bid } from '../database/entities/bid.entity';
import { Auction, AuctionStatus } from '../database/entities/auction.entity';
import { User } from '../database/entities/user.entity';
import { CreateBidDto, GetBidsQueryDto, BidResponseDto, PaginatedBidsResponseDto } from './dto';
import { BidEventService } from '../messaging/bid-event.service';

@Injectable()
export class BidsService {
  constructor(
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    private bidEventService: BidEventService,
  ) {}

  async create(createBidDto: CreateBidDto, bidderId: string): Promise<BidResponseDto> {
    const { auctionId, amount, isAuto } = createBidDto;

    // Find the auction with its item and seller details
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ['item', 'item.seller'],
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    // Check if auction is running
    if (auction.status !== AuctionStatus.RUNNING) {
      throw new BadRequestException('Auction is not running for bidding');
    }

    // Check if auction has ended
    const now = new Date();
    if (now > auction.endAt) {
      throw new BadRequestException('Auction has ended');
    }

    // Check if bidder is not the seller
    if (auction.item.sellerId === bidderId) {
      throw new ForbiddenException('Sellers cannot bid on their own auctions');
    }

    // Get current highest bid for event comparison
    const currentHighestBid = await this.bidRepository.findOne({
      where: { auctionId },
      order: { amount: 'DESC' },
    });

    // Validate bid amount
    const minimumBid = currentHighestBid
      ? parseFloat(currentHighestBid.amount.toString()) + parseFloat(auction.minIncrement.toString())
      : parseFloat(auction.startingPrice.toString());

    if (amount < minimumBid) {
      throw new BadRequestException(
        `Bid amount must be at least $${minimumBid.toFixed(2)} (current minimum bid)`,
      );
    }

    // Check if bidder already has a higher or equal bid
    const existingBid = await this.bidRepository.findOne({
      where: { auctionId, bidderId },
      order: { amount: 'DESC' },
    });

    if (existingBid && parseFloat(existingBid.amount.toString()) >= amount) {
      throw new BadRequestException('You already have a higher or equal bid on this auction');
    }

    // Create the bid
    const bid = this.bidRepository.create({
      auctionId,
      bidderId,
      amount,
      isAuto: isAuto ?? false,
    });

    const savedBid = await this.bidRepository.save(bid);

    // Get the complete bid with related data
    const completeBid = await this.findOne(savedBid.id);

    // Publish bid events
    try {
      // Publish bid placed event
      await this.bidEventService.publishBidPlaced(completeBid, auction);

      // Check if this is a new highest bid
      const previousHighestAmount = currentHighestBid ? parseFloat(currentHighestBid.amount.toString()) : 0;
      if (amount > previousHighestAmount) {
        await this.bidEventService.publishHighestBidChanged(auctionId, completeBid, previousHighestAmount);

        // Check if reserve price was met for the first time
        if (auction.reservePrice && 
            amount >= parseFloat(auction.reservePrice.toString()) && 
            previousHighestAmount < parseFloat(auction.reservePrice.toString())) {
          await this.bidEventService.publishReservePriceMet(auctionId, completeBid, parseFloat(auction.reservePrice.toString()));
        }

        // Notify previous highest bidder that they were outbid
        if (currentHighestBid && currentHighestBid.bidderId !== bidderId) {
          await this.bidEventService.publishBidOutbid(currentHighestBid.bidderId, auctionId, completeBid);
        }
      }
    } catch (error) {
      // Log error but don't fail the bid - events are not critical
      console.error('Failed to publish bid events:', error);
    }

    return completeBid;
  }

  async findAll(query: GetBidsQueryDto): Promise<PaginatedBidsResponseDto> {
    const { auctionId, bidderId, page = 1, limit = 10, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.bidRepository.createQueryBuilder('bid')
      .leftJoinAndSelect('bid.auction', 'auction')
      .leftJoinAndSelect('auction.item', 'item')
      .leftJoinAndSelect('bid.bidder', 'bidder')
      .select([
        'bid.id',
        'bid.auctionId',
        'bid.bidderId',
        'bid.amount',
        'bid.isAuto',
        'bid.createdAt',
        'bid.modifiedAt',
        'auction.id',
        'auction.status',
        'item.id',
        'item.title',
        'item.description',
        'bidder.id',
        'bidder.name',
        'bidder.email',
      ]);

    // Apply filters
    if (auctionId) {
      queryBuilder.andWhere('bid.auctionId = :auctionId', { auctionId });
    }

    if (bidderId) {
      queryBuilder.andWhere('bid.bidderId = :bidderId', { bidderId });
    }

    // Apply sorting
    queryBuilder.orderBy(`bid.${sortBy}`, sortOrder);

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    const [bids, total] = await queryBuilder.getManyAndCount();

    const transformedBids = bids.map((bid) =>
      plainToClass(BidResponseDto, {
        ...bid,
        auction: bid.auction ? {
          id: bid.auction.id,
          status: bid.auction.status,
          item: bid.auction.item ? {
            id: bid.auction.item.id,
            title: bid.auction.item.title,
            description: bid.auction.item.description,
          } : undefined,
        } : undefined,
        bidder: bid.bidder ? {
          id: bid.bidder.id,
          name: bid.bidder.name,
          email: bid.bidder.email,
        } : undefined,
      }),
      { excludeExtraneousValues: true },
    );

    return plainToClass(
      PaginatedBidsResponseDto,
      {
        bids: transformedBids,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      { excludeExtraneousValues: true },
    );
  }

  async findOne(id: string): Promise<BidResponseDto> {
    const bid = await this.bidRepository.findOne({
      where: { id },
      relations: ['auction', 'auction.item', 'bidder'],
    });

    if (!bid) {
      throw new NotFoundException('Bid not found');
    }

    return plainToClass(
      BidResponseDto,
      {
        ...bid,
        auction: bid.auction ? {
          id: bid.auction.id,
          status: bid.auction.status,
          item: bid.auction.item ? {
            id: bid.auction.item.id,
            title: bid.auction.item.title,
            description: bid.auction.item.description,
          } : undefined,
        } : undefined,
        bidder: bid.bidder ? {
          id: bid.bidder.id,
          name: bid.bidder.name,
          email: bid.bidder.email,
        } : undefined,
      },
      { excludeExtraneousValues: true },
    );
  }

  async findByBidderId(bidderId: string): Promise<BidResponseDto[]> {
    const bids = await this.bidRepository.find({
      where: { bidderId },
      relations: ['auction', 'auction.item', 'bidder'],
      order: { createdAt: 'DESC' },
    });

    return bids.map((bid) =>
      plainToClass(
        BidResponseDto,
        {
          ...bid,
          auction: bid.auction ? {
            id: bid.auction.id,
            status: bid.auction.status,
            item: bid.auction.item ? {
              id: bid.auction.item.id,
              title: bid.auction.item.title,
              description: bid.auction.item.description,
            } : undefined,
          } : undefined,
          bidder: bid.bidder ? {
            id: bid.bidder.id,
            name: bid.bidder.name,
            email: bid.bidder.email,
          } : undefined,
        },
        { excludeExtraneousValues: true },
      ),
    );
  }

  async findByAuctionId(auctionId: string): Promise<BidResponseDto[]> {
    const bids = await this.bidRepository.find({
      where: { auctionId },
      relations: ['auction', 'auction.item', 'bidder'],
      order: { amount: 'DESC', createdAt: 'DESC' },
    });

    return bids.map((bid) =>
      plainToClass(
        BidResponseDto,
        {
          ...bid,
          auction: bid.auction ? {
            id: bid.auction.id,
            status: bid.auction.status,
            item: bid.auction.item ? {
              id: bid.auction.item.id,
              title: bid.auction.item.title,
              description: bid.auction.item.description,
            } : undefined,
          } : undefined,
          bidder: bid.bidder ? {
            id: bid.bidder.id,
            name: bid.bidder.name,
            email: bid.bidder.email,
          } : undefined,
        },
        { excludeExtraneousValues: true },
      ),
    );
  }

  async getHighestBidForAuction(auctionId: string): Promise<BidResponseDto | null> {
    const bid = await this.bidRepository.findOne({
      where: { auctionId },
      relations: ['auction', 'auction.item', 'bidder'],
      order: { amount: 'DESC' },
    });

    if (!bid) {
      return null;
    }

    return plainToClass(
      BidResponseDto,
      {
        ...bid,
        auction: bid.auction ? {
          id: bid.auction.id,
          status: bid.auction.status,
          item: bid.auction.item ? {
            id: bid.auction.item.id,
            title: bid.auction.item.title,
            description: bid.auction.item.description,
          } : undefined,
        } : undefined,
        bidder: bid.bidder ? {
          id: bid.bidder.id,
          name: bid.bidder.name,
          email: bid.bidder.email,
        } : undefined,
      },
      { excludeExtraneousValues: true },
    );
  }
}