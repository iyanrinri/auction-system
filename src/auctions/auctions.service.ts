import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Auction, AuctionStatus } from '../database/entities/auction.entity';
import { Item } from '../database/entities/item.entity';
import { Bid } from '../database/entities/bid.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { GetAuctionsQueryDto } from './dto/get-auctions-query.dto';
import { AuctionResponseDto, PaginatedAuctionsResponseDto } from './dto/auction-response.dto';

@Injectable()
export class AuctionsService {
  constructor(
    @InjectRepository(Auction)
    private readonly auctionRepository: Repository<Auction>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(Bid)
    private readonly bidRepository: Repository<Bid>,
  ) {}

  async create(createAuctionDto: CreateAuctionDto, sellerId: string): Promise<AuctionResponseDto> {
    // Validate item exists and belongs to seller
    const item = await this.itemRepository.findOne({
      where: { id: createAuctionDto.itemId },
      relations: ['seller', 'auction'],
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${createAuctionDto.itemId} not found`);
    }

    if (item.sellerId !== sellerId) {
      throw new ForbiddenException('You can only create auctions for your own items');
    }

    if (item.auction) {
      throw new BadRequestException('Item already has an auction');
    }

    // Validate dates
    const startAt = new Date(createAuctionDto.startAt);
    const endAt = new Date(createAuctionDto.endAt);
    const now = new Date();

    if (startAt < now) {
      throw new BadRequestException('Start time must be in the future');
    }

    if (endAt <= startAt) {
      throw new BadRequestException('End time must be after start time');
    }

    // Validate price relationships
    if (createAuctionDto.reservePrice && createAuctionDto.reservePrice < createAuctionDto.startingPrice) {
      throw new BadRequestException('Reserve price must be greater than or equal to starting price');
    }

    if (createAuctionDto.buyNowPrice && createAuctionDto.buyNowPrice <= createAuctionDto.startingPrice) {
      throw new BadRequestException('Buy now price must be greater than starting price');
    }

    const auction = this.auctionRepository.create({
      ...createAuctionDto,
      startAt,
      endAt,
      status: AuctionStatus.SCHEDULED,
    });

    const savedAuction = await this.auctionRepository.save(auction);
    return this.findOne(savedAuction.id);
  }

  async findAll(query: GetAuctionsQueryDto): Promise<PaginatedAuctionsResponseDto> {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'endAt', 
      sortOrder = 'ASC', 
      q, 
      status, 
      sellerId,
      minPrice,
      maxPrice 
    } = query;
    
    const queryBuilder = this.createAuctionQueryBuilder();

    // Apply filters
    if (q) {
      queryBuilder.andWhere(
        '(LOWER(item.title) LIKE LOWER(:search) OR LOWER(item.description) LIKE LOWER(:search))',
        { search: `%${q}%` }
      );
    }

    if (status) {
      queryBuilder.andWhere('auction.status = :status', { status });
    }

    if (sellerId) {
      queryBuilder.andWhere('item.sellerId = :sellerId', { sellerId });
    }

    if (minPrice) {
      queryBuilder.andWhere('auction.startingPrice >= :minPrice', { minPrice });
    }

    if (maxPrice) {
      queryBuilder.andWhere('auction.startingPrice <= :maxPrice', { maxPrice });
    }

    // Apply sorting
    const validSortFields = ['createdAt', 'startAt', 'endAt', 'startingPrice'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'endAt';
    queryBuilder.orderBy(`auction.${sortField}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [auctions, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    const auctionResponses = await Promise.all(
      auctions.map(auction => this.transformToResponseDto(auction))
    );

    return {
      auctions: auctionResponses,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<AuctionResponseDto> {
    const auction = await this.createAuctionQueryBuilder()
      .andWhere('auction.id = :id', { id })
      .getOne();

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${id} not found`);
    }

    return this.transformToResponseDto(auction);
  }

  async update(
    id: string,
    updateAuctionDto: UpdateAuctionDto,
    user: User,
  ): Promise<AuctionResponseDto> {
    const auction = await this.auctionRepository.findOne({
      where: { id },
      relations: ['item', 'item.seller'],
    });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${id} not found`);
    }

    // Check permissions
    if (user.role !== UserRole.ADMIN && auction.item.sellerId !== user.id) {
      throw new ForbiddenException('You can only update your own auctions');
    }

    // Check if auction can be updated
    if (auction.status === AuctionStatus.RUNNING || auction.status === AuctionStatus.ENDED) {
      throw new BadRequestException('Cannot update running or ended auctions');
    }

    // Validate date changes if provided
    if (updateAuctionDto.startAt || updateAuctionDto.endAt) {
      const startAt = updateAuctionDto.startAt ? new Date(updateAuctionDto.startAt) : auction.startAt;
      const endAt = updateAuctionDto.endAt ? new Date(updateAuctionDto.endAt) : auction.endAt;
      const now = new Date();

      if (startAt < now) {
        throw new BadRequestException('Start time must be in the future');
      }

      if (endAt <= startAt) {
        throw new BadRequestException('End time must be after start time');
      }
    }

    await this.auctionRepository.update(id, {
      ...updateAuctionDto,
      startAt: updateAuctionDto.startAt ? new Date(updateAuctionDto.startAt) : undefined,
      endAt: updateAuctionDto.endAt ? new Date(updateAuctionDto.endAt) : undefined,
    });

    return this.findOne(id);
  }

  async remove(id: string, user: User): Promise<void> {
    const auction = await this.auctionRepository.findOne({
      where: { id },
      relations: ['item', 'item.seller', 'bids'],
    });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${id} not found`);
    }

    // Check permissions
    if (user.role !== UserRole.ADMIN && auction.item.sellerId !== user.id) {
      throw new ForbiddenException('You can only delete your own auctions');
    }

    // Check if auction can be deleted
    if (auction.status === AuctionStatus.RUNNING || auction.status === AuctionStatus.ENDED) {
      throw new BadRequestException('Cannot delete running or ended auctions');
    }

    if (auction.bids && auction.bids.length > 0) {
      throw new BadRequestException('Cannot delete auction with existing bids');
    }

    await this.auctionRepository.remove(auction);
  }

  async findBySellerId(sellerId: string): Promise<AuctionResponseDto[]> {
    const auctions = await this.createAuctionQueryBuilder()
      .andWhere('item.sellerId = :sellerId', { sellerId })
      .getMany();

    return Promise.all(auctions.map(auction => this.transformToResponseDto(auction)));
  }

  private createAuctionQueryBuilder(): SelectQueryBuilder<Auction> {
    return this.auctionRepository
      .createQueryBuilder('auction')
      .leftJoinAndSelect('auction.item', 'item')
      .leftJoinAndSelect('item.seller', 'seller')
      .select([
        'auction.id',
        'auction.itemId',
        'auction.startingPrice',
        'auction.reservePrice',
        'auction.buyNowPrice',
        'auction.minIncrement',
        'auction.startAt',
        'auction.endAt',
        'auction.status',
        'auction.autoExtendSeconds',
        'auction.createdAt',
        'auction.modifiedAt',
        'item.id',
        'item.sellerId',
        'item.title',
        'item.description',
        'item.metadata',
        'seller.id',
        'seller.email',
        'seller.name',
        'seller.role',
      ]);
  }

  private async transformToResponseDto(auction: any): Promise<AuctionResponseDto> {
    // Get current highest bid
    const highestBid = await this.bidRepository
      .createQueryBuilder('bid')
      .leftJoinAndSelect('bid.bidder', 'bidder')
      .where('bid.auctionId = :auctionId', { auctionId: auction.id })
      .orderBy('bid.amount', 'DESC')
      .select([
        'bid.id',
        'bid.amount',
        'bid.bidderId',
        'bid.createdAt',
        'bidder.id',
        'bidder.email',
        'bidder.name',
      ])
      .getOne();

    // Get bid count
    const bidCount = await this.bidRepository
      .createQueryBuilder('bid')
      .where('bid.auctionId = :auctionId', { auctionId: auction.id })
      .getCount();

    // Calculate time remaining
    const now = new Date();
    const endAt = new Date(auction.endAt);
    const timeRemaining = auction.status === AuctionStatus.RUNNING && endAt > now 
      ? endAt.getTime() - now.getTime() 
      : null;

    // Check if reserve price is met
    const reservePriceMet = auction.reservePrice 
      ? (highestBid?.amount || 0) >= auction.reservePrice
      : true;

    return {
      id: auction.id,
      itemId: auction.itemId,
      startingPrice: parseFloat(auction.startingPrice),
      reservePrice: auction.reservePrice ? parseFloat(auction.reservePrice) : undefined,
      buyNowPrice: auction.buyNowPrice ? parseFloat(auction.buyNowPrice) : undefined,
      minIncrement: parseFloat(auction.minIncrement),
      startAt: auction.startAt,
      endAt: auction.endAt,
      status: auction.status,
      autoExtendSeconds: auction.autoExtendSeconds,
      createdAt: auction.createdAt,
      modifiedAt: auction.modifiedAt,
      item: {
        id: auction.item.id,
        title: auction.item.title,
        description: auction.item.description,
        sellerId: auction.item.sellerId,
        metadata: auction.item.metadata,
        seller: {
          id: auction.item.seller.id,
          email: auction.item.seller.email,
          name: auction.item.seller.name,
          role: auction.item.seller.role,
        },
      },
      currentHighestBid: highestBid ? {
        id: highestBid.id,
        amount: parseFloat(highestBid.amount.toString()),
        bidderId: highestBid.bidderId,
        bidder: {
          id: highestBid.bidder.id,
          email: highestBid.bidder.email,
          name: highestBid.bidder.name,
        },
        createdAt: highestBid.createdAt,
      } : undefined,
      bidCount,
      timeRemaining: timeRemaining ?? undefined,
      reservePriceMet,
    };
  }
}