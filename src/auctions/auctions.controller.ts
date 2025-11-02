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
import { AuctionsService } from './auctions.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { GetAuctionsQueryDto } from './dto/get-auctions-query.dto';
import { AuctionResponseDto, PaginatedAuctionsResponseDto } from './dto/auction-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../database/entities/user.entity';
import { AuctionStatus } from '../database/entities/auction.entity';

@ApiTags('Auctions')
@Controller('auctions')
@UseGuards(JwtAuthGuard)
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new auction (Seller only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Auction created successfully',
    type: AuctionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Seller role required or item not owned by user',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request - Invalid input data or item already has auction',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Not Found - Item not found',
  })
  async create(@Body() createAuctionDto: CreateAuctionDto, @Request() req): Promise<AuctionResponseDto> {
    return this.auctionsService.create(createAuctionDto, req.user.id);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all auctions with filtering and pagination (Public)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Auctions retrieved successfully',
    type: PaginatedAuctionsResponseDto,
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search query for auction item title or description',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by auction status',
    enum: AuctionStatus,
  })
  @ApiQuery({
    name: 'sellerId',
    required: false,
    description: 'Filter by seller ID',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    description: 'Filter by minimum starting price',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    description: 'Filter by maximum starting price',
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
    description: 'Number of auctions per page',
    example: 10,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort field',
    enum: ['createdAt', 'startAt', 'endAt', 'startingPrice'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
  })
  async findAll(@Query() query: GetAuctionsQueryDto): Promise<PaginatedAuctionsResponseDto> {
    return this.auctionsService.findAll(query);
  }

  @Get('my-auctions')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get current user\'s auctions (Seller only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User\'s auctions retrieved successfully',
    type: [AuctionResponseDto],
  })
  async findMyAuctions(@Request() req): Promise<AuctionResponseDto[]> {
    return this.auctionsService.findBySellerId(req.user.id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get auction by ID with current highest bid and time remaining (Public)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Auction retrieved successfully',
    type: AuctionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Auction not found',
  })
  async findOne(@Param('id') id: string): Promise<AuctionResponseDto> {
    return this.auctionsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update auction (Seller/Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Auction updated successfully',
    type: AuctionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Auction not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Can only update own auctions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot update running or ended auctions',
  })
  async update(
    @Param('id') id: string,
    @Body() updateAuctionDto: UpdateAuctionDto,
    @Request() req,
  ): Promise<AuctionResponseDto> {
    return this.auctionsService.update(id, updateAuctionDto, req.user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete auction (Seller/Admin only)' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Auction deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Auction not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Can only delete own auctions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete running/ended auctions or auctions with bids',
  })
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    return this.auctionsService.remove(id, req.user);
  }
}