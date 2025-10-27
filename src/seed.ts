import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeederService } from './database/seeders/seeder.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const seederService = app.get(SeederService);
  
  try {
    await seederService.runAllSeeders();
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    await app.close();
    process.exit(1);
  }
}

bootstrap();