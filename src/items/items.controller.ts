import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { GetItemsQueryDto } from './dto/get-items-query.dto';
import { ItemResponseDto, PaginatedItemsResponseDto } from './dto/item-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';

@ApiTags('Items')
@Controller('items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new item (Seller only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Item created successfully',
    type: ItemResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Seller role required',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request - Invalid input data',
  })
  async create(@Body() createItemDto: CreateItemDto, @Request() req): Promise<ItemResponseDto> {
    return this.itemsService.create(createItemDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all items with filtering and pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Items retrieved successfully',
    type: PaginatedItemsResponseDto,
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search query for item title or description',
  })
  @ApiQuery({
    name: 'sellerId',
    required: false,
    description: 'Filter by seller ID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort field',
    enum: ['createdAt', 'title', 'modifiedAt'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
  })
  async findAll(@Query() query: GetItemsQueryDto): Promise<PaginatedItemsResponseDto> {
    return this.itemsService.findAll(query);
  }

  @Get('my-items')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get current user\'s items (Seller only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User\'s items retrieved successfully',
    type: [ItemResponseDto],
  })
  async findMyItems(@Request() req): Promise<ItemResponseDto[]> {
    return this.itemsService.findBySellerId(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get item by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Item retrieved successfully',
    type: ItemResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Item not found',
  })
  async findOne(@Param('id') id: string): Promise<ItemResponseDto> {
    return this.itemsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update item (Seller/Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Item updated successfully',
    type: ItemResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Item not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Can only update own items',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot update item that already has an auction',
  })
  async update(
    @Param('id') id: string,
    @Body() updateItemDto: UpdateItemDto,
    @Request() req,
  ): Promise<ItemResponseDto> {
    return this.itemsService.update(id, updateItemDto, req.user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete item (Seller/Admin only)' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Item deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Item not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Can only delete own items',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete item that has an auction',
  })
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    return this.itemsService.remove(id, req.user);
  }
}