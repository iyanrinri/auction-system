import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Item } from '../database/entities/item.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { GetItemsQueryDto } from './dto/get-items-query.dto';
import { ItemResponseDto, PaginatedItemsResponseDto } from './dto/item-response.dto';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
  ) {}

  async create(createItemDto: CreateItemDto, sellerId: string): Promise<ItemResponseDto> {
    const item = this.itemRepository.create({
      ...createItemDto,
      sellerId,
    });

    const savedItem = await this.itemRepository.save(item);
    return this.findOne(savedItem.id);
  }

  async findAll(query: GetItemsQueryDto): Promise<PaginatedItemsResponseDto> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC', q, sellerId } = query;
    
    const queryBuilder = this.createItemQueryBuilder();

    // Apply filters
    if (q) {
      queryBuilder.andWhere(
        '(LOWER(item.title) LIKE LOWER(:search) OR LOWER(item.description) LIKE LOWER(:search))',
        { search: `%${q}%` }
      );
    }

    if (sellerId) {
      queryBuilder.andWhere('item.sellerId = :sellerId', { sellerId });
    }

    // Apply sorting
    const validSortFields = ['createdAt', 'title', 'modifiedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`item.${sortField}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map(item => this.transformToResponseDto(item)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<ItemResponseDto> {
    const item = await this.createItemQueryBuilder()
      .andWhere('item.id = :id', { id })
      .getOne();

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return this.transformToResponseDto(item);
  }

  async findByIds(ids: string[]): Promise<ItemResponseDto[]> {
    if (ids.length === 0) return [];

    const items = await this.createItemQueryBuilder()
      .andWhere('item.id IN (:...ids)', { ids })
      .getMany();

    return items.map(item => this.transformToResponseDto(item));
  }

  async update(
    id: string,
    updateItemDto: UpdateItemDto,
    user: User,
  ): Promise<ItemResponseDto> {
    const item = await this.itemRepository.findOne({
      where: { id },
      relations: ['seller'],
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    // Check if user can update this item
    if (user.role !== UserRole.ADMIN && item.sellerId !== user.id) {
      throw new ForbiddenException('You can only update your own items');
    }

    // Check if item already has an auction
    const itemWithAuction = await this.itemRepository.findOne({
      where: { id },
      relations: ['auction'],
    });

    if (itemWithAuction?.auction) {
      throw new BadRequestException('Cannot update item that already has an auction');
    }

    await this.itemRepository.update(id, updateItemDto);
    return this.findOne(id);
  }

  async remove(id: string, user: User): Promise<void> {
    const item = await this.itemRepository.findOne({
      where: { id },
      relations: ['seller', 'auction'],
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    // Check if user can delete this item
    if (user.role !== UserRole.ADMIN && item.sellerId !== user.id) {
      throw new ForbiddenException('You can only delete your own items');
    }

    // Check if item has an auction
    if (item.auction) {
      throw new BadRequestException('Cannot delete item that has an auction');
    }

    await this.itemRepository.remove(item);
  }

  async findBySellerId(sellerId: string): Promise<ItemResponseDto[]> {
    const items = await this.createItemQueryBuilder()
      .andWhere('item.sellerId = :sellerId', { sellerId })
      .getMany();

    return items.map(item => this.transformToResponseDto(item));
  }

  private createItemQueryBuilder(): SelectQueryBuilder<Item> {
    return this.itemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.seller', 'seller')
      .leftJoinAndSelect('item.auction', 'auction')
      .select([
        'item.id',
        'item.sellerId',
        'item.title',
        'item.description',
        'item.metadata',
        'item.createdAt',
        'item.modifiedAt',
        'seller.id',
        'seller.email',
        'seller.name',
        'seller.role',
        'auction.id',
        'auction.startingPrice',
        'auction.status',
        'auction.startAt',
        'auction.endAt',
      ]);
  }

  private transformToResponseDto(item: any): ItemResponseDto {
    return {
      id: item.id,
      sellerId: item.sellerId,
      title: item.title,
      description: item.description,
      metadata: item.metadata,
      createdAt: item.createdAt,
      modifiedAt: item.modifiedAt,
      seller: item.seller ? {
        id: item.seller.id,
        email: item.seller.email,
        name: item.seller.name,
        role: item.seller.role,
      } : undefined,
      auction: item.auction ? {
        id: item.auction.id,
        startingPrice: parseFloat(item.auction.startingPrice),
        status: item.auction.status,
        startAt: item.auction.startAt,
        endAt: item.auction.endAt,
      } : undefined,
    };
  }
}