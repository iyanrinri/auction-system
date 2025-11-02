import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Auction System API')
    .setDescription('A comprehensive auction system API with user authentication, bidding functionality, and real-time updates via WebSocket')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'User registration and login endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Auctions', 'Auction management endpoints')
    .addTag('Bids', 'Bidding system endpoints')
    .addTag('Items', 'Item management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Enable CORS for development (including WebSocket)
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  console.log(`🔌 WebSocket server: ws://localhost:${port}/auctions`);
}
bootstrap();
