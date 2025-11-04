import { Controller, Post, Get, UseGuards, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AutoBidderBotService } from './auto-bidder-bot.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';

@ApiTags('Bot')
@Controller('bot')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
export class BotsController {
  constructor(private readonly autoBidderBotService: AutoBidderBotService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start the auto-bidder bot (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bot started successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin role required',
  })
  async startBot(): Promise<{ message: string }> {
    await this.autoBidderBotService.start();
    return { message: 'Auto-bidder bot started successfully' };
  }

  @Post('stop')
  @ApiOperation({ summary: 'Stop the auto-bidder bot (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bot stopped successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin role required',
  })
  stopBot(): { message: string } {
    this.autoBidderBotService.stop();
    return { message: 'Auto-bidder bot stopped successfully' };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get bot status (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bot status retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin role required',
  })
  getStatus(): {
    isRunning: boolean;
    botUsers: { id: string; email: string; name?: string }[];
  } {
    return this.autoBidderBotService.getStatus();
  }
}
