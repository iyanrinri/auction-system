import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
    await this.setupQueues();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL');
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      this.logger.log('Connected to RabbitMQ successfully');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  private async setupQueues() {
    try {
      // Queue untuk auction status updates
      await this.channel.assertQueue('auction.status.update', {
        durable: true,
        arguments: { 'x-message-ttl': 300000 } // 5 minutes TTL
      });

      // Queue untuk bid notifications
      await this.channel.assertQueue('bid.notifications', {
        durable: true,
        arguments: { 'x-message-ttl': 300000 }
      });

      // Queue untuk auction events
      await this.channel.assertQueue('auction.events', {
        durable: true,
        arguments: { 'x-message-ttl': 300000 }
      });

      // Exchange untuk broadcasting events
      await this.channel.assertExchange('auction.exchange', 'topic', {
        durable: true
      });

      // Bind queues to exchange
      await this.channel.bindQueue('auction.status.update', 'auction.exchange', 'auction.status.*');
      await this.channel.bindQueue('bid.notifications', 'auction.exchange', 'bid.*');
      await this.channel.bindQueue('auction.events', 'auction.exchange', 'auction.*');

      this.logger.log('RabbitMQ queues and exchanges setup completed');
    } catch (error) {
      this.logger.error('Failed to setup RabbitMQ queues:', error);
      throw error;
    }
  }

  async publishMessage(exchange: string, routingKey: string, message: any) {
    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));
      await this.channel.publish(exchange, routingKey, messageBuffer, {
        persistent: true,
        timestamp: Date.now(),
        messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });

      this.logger.debug(`Message published to ${exchange} with routing key ${routingKey}`);
    } catch (error) {
      this.logger.error('Failed to publish message:', error);
      throw error;
    }
  }

  async publishToQueue(queueName: string, message: any) {
    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));
      await this.channel.sendToQueue(queueName, messageBuffer, {
        persistent: true,
        timestamp: Date.now(),
        messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });

      this.logger.debug(`Message sent to queue ${queueName}`);
    } catch (error) {
      this.logger.error('Failed to send message to queue:', error);
      throw error;
    }
  }

  async consumeQueue(queueName: string, callback: (message: any) => Promise<void>) {
    try {
      await this.channel.consume(queueName, async (msg) => {
        if (msg) {
          try {
            const messageContent = JSON.parse(msg.content.toString());
            await callback(messageContent);
            this.channel.ack(msg);
            this.logger.debug(`Message processed from queue ${queueName}`);
          } catch (error) {
            this.logger.error(`Error processing message from ${queueName}:`, error);
            this.channel.nack(msg, false, false); // Dead letter the message
          }
        }
      });

      this.logger.log(`Started consuming messages from queue ${queueName}`);
    } catch (error) {
      this.logger.error(`Failed to consume from queue ${queueName}:`, error);
      throw error;
    }
  }

  private async disconnect() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ:', error);
    }
  }

  getChannel(): amqp.Channel {
    return this.channel;
  }

  isConnected(): boolean {
    return this.connection && !this.connection.destroyed;
  }
}