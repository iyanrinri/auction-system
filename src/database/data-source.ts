import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

// Load environment variables
config();

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: parseInt(configService.get('DB_PORT', '5433')),
  username: configService.get('DB_USERNAME', 'auction_user'),
  password: configService.get('DB_PASSWORD', 'auction_password'),
  database: configService.get('DB_NAME', 'auction_system'),
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false, // Always false in production
  logging: configService.get('NODE_ENV') === 'development',
});