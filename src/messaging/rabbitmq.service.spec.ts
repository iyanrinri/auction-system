import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import * as amqp from 'amqplib';

// Mock amqplib
jest.mock('amqplib');
const mockedAmqp = amqp as jest.Mocked<typeof amqp>;

describe('RabbitMQService', () => {
  let service: RabbitMQService;
  let configService: jest.Mocked<ConfigService>;
  let mockConnection: jest.Mocked<amqp.Connection>;
  let mockChannel: jest.Mocked<amqp.Channel>;

  beforeEach(async () => {
    // Mock connection and channel
    mockChannel = {
      assertQueue: jest.fn(),
      assertExchange: jest.fn(),
      bindQueue: jest.fn(),
      publish: jest.fn(),
      sendToQueue: jest.fn(),
      consume: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
      close: jest.fn(),
    } as any;

    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn(),
      destroyed: false,
    } as any;

    mockedAmqp.connect.mockResolvedValue(mockConnection);

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitMQService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RabbitMQService>(RabbitMQService);
    configService = module.get(ConfigService);

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect and setup queues successfully', async () => {
      // Arrange
      configService.get.mockReturnValue('amqp://localhost');
      mockChannel.assertQueue.mockResolvedValue({} as any);
      mockChannel.assertExchange.mockResolvedValue({} as any);
      mockChannel.bindQueue.mockResolvedValue({} as any);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockedAmqp.connect).toHaveBeenCalledWith('amqp://localhost');
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.assertQueue).toHaveBeenCalledTimes(3); // 3 queues
      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        'auction.exchange',
        'topic',
        { durable: true },
      );
      expect(mockChannel.bindQueue).toHaveBeenCalledTimes(3); // 3 bindings
      expect(Logger.prototype.log).toHaveBeenCalledWith('Connected to RabbitMQ successfully');
      expect(Logger.prototype.log).toHaveBeenCalledWith('RabbitMQ queues and exchanges setup completed');
    });

    it('should handle connection errors', async () => {
      // Arrange
      const error = new Error('Connection failed');
      configService.get.mockReturnValue('amqp://localhost');
      mockedAmqp.connect.mockRejectedValue(error);

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow(error);
      expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to connect to RabbitMQ:', error);
    });

    it('should handle queue setup errors', async () => {
      // Arrange
      const error = new Error('Queue setup failed');
      configService.get.mockReturnValue('amqp://localhost');
      mockChannel.assertQueue.mockRejectedValue(error);

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow(error);
      expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to setup RabbitMQ queues:', error);
    });
  });

  describe('publishMessage', () => {
    beforeEach(async () => {
      configService.get.mockReturnValue('amqp://localhost');
      mockChannel.assertQueue.mockResolvedValue({} as any);
      mockChannel.assertExchange.mockResolvedValue({} as any);
      mockChannel.bindQueue.mockResolvedValue({} as any);
      await service.onModuleInit();
    });

    it('should publish message to exchange successfully', async () => {
      // Arrange
      const exchange = 'auction.exchange';
      const routingKey = 'bid.placed';
      const message = { event: 'test', data: 'test data' };
      mockChannel.publish.mockResolvedValue(true);

      // Act
      await service.publishMessage(exchange, routingKey, message);

      // Assert
      expect(mockChannel.publish).toHaveBeenCalledWith(
        exchange,
        routingKey,
        expect.any(Buffer),
        expect.objectContaining({
          persistent: true,
          timestamp: expect.any(Number),
          messageId: expect.any(String),
        }),
      );
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        `Message published to ${exchange} with routing key ${routingKey}`,
      );
    });

    it('should handle publish errors', async () => {
      // Arrange
      const error = new Error('Publish failed');
      mockChannel.publish.mockRejectedValue(error);

      // Act & Assert
      await expect(service.publishMessage('exchange', 'key', {})).rejects.toThrow(error);
      expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to publish message:', error);
    });
  });

  describe('publishToQueue', () => {
    beforeEach(async () => {
      configService.get.mockReturnValue('amqp://localhost');
      mockChannel.assertQueue.mockResolvedValue({} as any);
      mockChannel.assertExchange.mockResolvedValue({} as any);
      mockChannel.bindQueue.mockResolvedValue({} as any);
      await service.onModuleInit();
    });

    it('should send message to queue successfully', async () => {
      // Arrange
      const queueName = 'test.queue';
      const message = { event: 'test', data: 'test data' };
      mockChannel.sendToQueue.mockResolvedValue(true);

      // Act
      await service.publishToQueue(queueName, message);

      // Assert
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        queueName,
        expect.any(Buffer),
        expect.objectContaining({
          persistent: true,
          timestamp: expect.any(Number),
          messageId: expect.any(String),
        }),
      );
      expect(Logger.prototype.debug).toHaveBeenCalledWith(`Message sent to queue ${queueName}`);
    });

    it('should handle send to queue errors', async () => {
      // Arrange
      const error = new Error('Send failed');
      mockChannel.sendToQueue.mockRejectedValue(error);

      // Act & Assert
      await expect(service.publishToQueue('queue', {})).rejects.toThrow(error);
      expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to send message to queue:', error);
    });
  });

  describe('consumeQueue', () => {
    beforeEach(async () => {
      configService.get.mockReturnValue('amqp://localhost');
      mockChannel.assertQueue.mockResolvedValue({} as any);
      mockChannel.assertExchange.mockResolvedValue({} as any);
      mockChannel.bindQueue.mockResolvedValue({} as any);
      await service.onModuleInit();
    });

    it('should start consuming messages successfully', async () => {
      // Arrange
      const queueName = 'test.queue';
      const callback = jest.fn().mockResolvedValue(undefined);
      mockChannel.consume.mockResolvedValue({} as any);

      // Act
      await service.consumeQueue(queueName, callback);

      // Assert
      expect(mockChannel.consume).toHaveBeenCalledWith(queueName, expect.any(Function));
      expect(Logger.prototype.log).toHaveBeenCalledWith(`Started consuming messages from queue ${queueName}`);
    });

    it('should handle message processing successfully', async () => {
      // Arrange
      const queueName = 'test.queue';
      const callback = jest.fn().mockResolvedValue(undefined);
      const mockMessage = {
        content: Buffer.from(JSON.stringify({ event: 'test' })),
      };
      
      let messageHandler: (msg: any) => Promise<void> = async () => {};
      mockChannel.consume.mockImplementation((queue, handler) => {
        messageHandler = handler!;
        return Promise.resolve({} as any);
      });

      // Act
      await service.consumeQueue(queueName, callback);
      await messageHandler(mockMessage);

      // Assert
      expect(callback).toHaveBeenCalledWith({ event: 'test' });
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle message processing errors', async () => {
      // Arrange
      const queueName = 'test.queue';
      const callback = jest.fn().mockRejectedValue(new Error('Processing failed'));
      const mockMessage = {
        content: Buffer.from(JSON.stringify({ event: 'test' })),
      };
      
      let messageHandler: (msg: any) => Promise<void> = async () => {};
      mockChannel.consume.mockImplementation((queue, handler) => {
        messageHandler = handler!;
        return Promise.resolve({} as any);
      });

      // Act
      await service.consumeQueue(queueName, callback);
      await messageHandler(mockMessage);

      // Assert
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        `Error processing message from ${queueName}:`,
        expect.any(Error),
      );
    });

    it('should handle consume setup errors', async () => {
      // Arrange
      const error = new Error('Consume failed');
      mockChannel.consume.mockRejectedValue(error);

      // Act & Assert
      await expect(service.consumeQueue('queue', jest.fn())).rejects.toThrow(error);
      expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to consume from queue queue:', error);
    });
  });

  describe('onModuleDestroy', () => {
    beforeEach(async () => {
      configService.get.mockReturnValue('amqp://localhost');
      mockChannel.assertQueue.mockResolvedValue({} as any);
      mockChannel.assertExchange.mockResolvedValue({} as any);
      mockChannel.bindQueue.mockResolvedValue({} as any);
      await service.onModuleInit();
    });

    it('should disconnect gracefully', async () => {
      // Arrange
      mockChannel.close.mockResolvedValue();
      mockConnection.close.mockResolvedValue();

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith('Disconnected from RabbitMQ');
    });

    it('should handle disconnect errors', async () => {
      // Arrange
      const error = new Error('Disconnect failed');
      mockChannel.close.mockRejectedValue(error);

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(Logger.prototype.error).toHaveBeenCalledWith('Error disconnecting from RabbitMQ:', error);
    });
  });

  describe('utility methods', () => {
    beforeEach(async () => {
      configService.get.mockReturnValue('amqp://localhost');
      mockChannel.assertQueue.mockResolvedValue({} as any);
      mockChannel.assertExchange.mockResolvedValue({} as any);
      mockChannel.bindQueue.mockResolvedValue({} as any);
      await service.onModuleInit();
    });

    it('should return channel', () => {
      // Act
      const channel = service.getChannel();

      // Assert
      expect(channel).toBe(mockChannel);
    });

    it('should return connection status', () => {
      // Act
      const isConnected = service.isConnected();

      // Assert
      expect(isConnected).toBe(true);
    });

    it('should return false when connection is destroyed', () => {
      // Arrange
      mockConnection.destroyed = true;

      // Act
      const isConnected = service.isConnected();

      // Assert
      expect(isConnected).toBe(false);
    });
  });
});