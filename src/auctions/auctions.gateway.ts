import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: '/auctions',
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    credentials: true,
  },
})
export class AuctionsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AuctionsGateway.name);
  private activeConnections = new Map<string, Set<string>>(); // auctionId -> Set of socketIds

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Extract and verify JWT token
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (token) {
        const payload = this.jwtService.verify(token);
        client.data.user = payload;
        this.logger.log(
          `Client connected: ${client.id} (User: ${payload.email})`,
        );
      } else {
        this.logger.log(`Client connected: ${client.id} (Anonymous)`);
      }
    } catch (error) {
      this.logger.error('Authentication error:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Remove client from all auction rooms
    this.activeConnections.forEach((clients, auctionId) => {
      if (clients.has(client.id)) {
        clients.delete(client.id);
        if (clients.size === 0) {
          this.activeConnections.delete(auctionId);
        } else {
          // Notify remaining clients about viewer count update
          this.server.to(`auction:${auctionId}`).emit('viewerCount', {
            auctionId,
            count: clients.size,
          });
        }
      }
    });

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinAuction')
  handleJoinAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody() auctionId: string,
  ) {
    client.join(`auction:${auctionId}`);

    // Track active connections
    if (!this.activeConnections.has(auctionId)) {
      this.activeConnections.set(auctionId, new Set());
    }
    const connections = this.activeConnections.get(auctionId);
    if (connections) {
      connections.add(client.id);
    }

    this.logger.log(`Client ${client.id} joined auction: ${auctionId}`);

    // Notify room about new viewer
    this.server.to(`auction:${auctionId}`).emit('viewerCount', {
      auctionId,
      count: this.activeConnections.get(auctionId)?.size || 0,
    });
  }

  @SubscribeMessage('leaveAuction')
  handleLeaveAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody() auctionId: string,
  ) {
    client.leave(`auction:${auctionId}`);

    // Remove from active connections
    const clients = this.activeConnections.get(auctionId);
    if (clients) {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.activeConnections.delete(auctionId);
      }
    }

    this.logger.log(`Client ${client.id} left auction: ${auctionId}`);

    // Notify room about viewer leaving
    this.server.to(`auction:${auctionId}`).emit('viewerCount', {
      auctionId,
      count: this.activeConnections.get(auctionId)?.size || 0,
    });
  }

  // Emit new bid to all clients in auction room
  emitNewBid(auctionId: string, bidData: any) {
    this.server.to(`auction:${auctionId}`).emit('newBid', {
      auctionId,
      bid: bidData,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `New bid emitted to auction ${auctionId}: $${bidData.amount}`,
    );
  }

  // Emit auction status change
  emitAuctionStatusChange(auctionId: string, status: string, data?: any) {
    this.server.to(`auction:${auctionId}`).emit('statusChange', {
      auctionId,
      status,
      data,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Status change emitted for auction ${auctionId}: ${status}`,
    );
  }

  // Emit auction ending soon warning
  emitAuctionEndingSoon(auctionId: string, timeRemaining: number) {
    this.server.to(`auction:${auctionId}`).emit('endingSoon', {
      auctionId,
      timeRemainingSeconds: timeRemaining,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Ending soon notification for auction ${auctionId}: ${timeRemaining}s remaining`,
    );
  }

  // Emit price update
  emitPriceUpdate(auctionId: string, currentPrice: number, bidCount: number) {
    this.server.to(`auction:${auctionId}`).emit('priceUpdate', {
      auctionId,
      currentPrice,
      bidCount,
      timestamp: new Date().toISOString(),
    });
  }

  // Get active viewers count for an auction
  getActiveViewers(auctionId: string): number {
    return this.activeConnections.get(auctionId)?.size || 0;
  }
}
