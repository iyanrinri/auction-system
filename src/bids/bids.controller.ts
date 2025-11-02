import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
import { BidsService } from './bids.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { GetBidsQueryDto } from './dto/get-bids-query.dto';
import { BidResponseDto, PaginatedBidsResponseDto } from './dto/bid-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Bids')
@Controller('bids')
@UseGuards(JwtAuthGuard)
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.USER, UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Place a bid on an auction' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bid placed successfully',
    type: BidResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Cannot bid on own auction or insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request - Invalid bid amount, auction not running, or auction ended',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Not Found - Auction not found',
  })
  async create(@Body() createBidDto: CreateBidDto, @Request() req): Promise<BidResponseDto> {
    return this.bidsService.create(createBidDto, req.user.id);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all bids with filtering and pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bids retrieved successfully',
    type: PaginatedBidsResponseDto,
  })
  @ApiQuery({
    name: 'auctionId',
    required: false,
    description: 'Filter by auction ID',
  })
  @ApiQuery({
    name: 'bidderId',
    required: false,
    description: 'Filter by bidder ID',
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
    description: 'Number of bids per page',
    example: 10,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort field',
    enum: ['createdAt', 'amount'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
  })
  async findAll(@Query() query: GetBidsQueryDto): Promise<PaginatedBidsResponseDto> {
    return this.bidsService.findAll(query);
  }

  @Get('my-bids')
  @ApiOperation({ summary: 'Get current user\'s bids' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User\'s bids retrieved successfully',
    type: [BidResponseDto],
  })
  async findMyBids(@Request() req): Promise<BidResponseDto[]> {
    return this.bidsService.findByBidderId(req.user.id);
  }

  @Get('auction/:auctionId')
  @Public()
  @ApiOperation({ summary: 'Get all bids for a specific auction' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Auction bids retrieved successfully',
    type: [BidResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Auction not found',
  })
  async findByAuctionId(@Param('auctionId') auctionId: string): Promise<BidResponseDto[]> {
    return this.bidsService.findByAuctionId(auctionId);
  }

  @Get('auction/:auctionId/highest')
  @Public()
  @ApiOperation({ summary: 'Get the highest bid for a specific auction' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Highest bid retrieved successfully',
    type: BidResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No bids found for this auction',
  })
  async getHighestBid(@Param('auctionId') auctionId: string): Promise<BidResponseDto | null> {
    return this.bidsService.getHighestBidForAuction(auctionId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get bid by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bid retrieved successfully',
    type: BidResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bid not found',
  })
  async findOne(@Param('id') id: string): Promise<BidResponseDto> {
    return this.bidsService.findOne(id);
  }
}