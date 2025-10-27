import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export abstract class BaseSeeder {
  constructor(protected dataSource: DataSource) {}

  abstract run(): Promise<void>;
}