import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuctionStatusService } from './auction-status.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';

@ApiTags('Auction Status')
@Controller('auction-status')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuctionStatusController {
  constructor(private readonly auctionStatusService: AuctionStatusService) {}

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get auction status statistics (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Auction status statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        scheduled: { type: 'number', example: 5 },
        running: { type: 'number', example: 12 },
        ended: { type: 'number', example: 23 },
        cancelled: { type: 'number', example: 1 },
      },
    },
  })
  async getAuctionStatusStats() {
    return this.auctionStatusService.getAuctionStatusStats();
  }

  @Post('update/:auctionId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually update auction status (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Auction status updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Auction not found',
  })
  async manuallyUpdateAuctionStatus(@Param('auctionId') auctionId: string) {
    const auction = await this.auctionStatusService.manuallyUpdateAuctionStatus(auctionId);
    return {
      message: 'Auction status updated successfully',
      auction: {
        id: auction.id,
        status: auction.status,
        startAt: auction.startAt,
        endAt: auction.endAt,
        modifiedAt: auction.modifiedAt,
      },
    };
  }

  @Post('trigger-update')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger auction status update job (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Auction status update job triggered successfully',
  })
  async triggerStatusUpdate() {
    await this.auctionStatusService.updateAuctionStatuses();
    return {
      message: 'Auction status update job triggered successfully',
      timestamp: new Date().toISOString(),
    };
  }
}