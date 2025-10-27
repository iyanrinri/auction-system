import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { BaseSeeder } from './base.seeder';

@Injectable()
export class UserSeeder extends BaseSeeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    const userRepository = this.dataSource.getRepository(User);

    // Check if admin already exists
    const existingAdmin = await userRepository.findOne({
      where: { email: 'admin@auction.com' },
    });

    if (!existingAdmin) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      
      const admin = userRepository.create({
        email: 'admin@auction.com',
        password: adminPassword,
        name: 'System Administrator',
        role: UserRole.ADMIN,
      });

      await userRepository.save(admin);
      console.log('✅ Admin user created');
    }

    // Check if seller already exists
    const existingSeller = await userRepository.findOne({
      where: { email: 'seller@auction.com' },
    });

    if (!existingSeller) {
      const sellerPassword = await bcrypt.hash('seller123', 10);
      
      const seller = userRepository.create({
        email: 'seller@auction.com',
        password: sellerPassword,
        name: 'Demo Seller',
        role: UserRole.SELLER,
      });

      await userRepository.save(seller);
      console.log('✅ Seller user created');
    }

    // Check if regular user already exists
    const existingUser = await userRepository.findOne({
      where: { email: 'user@auction.com' },
    });

    if (!existingUser) {
      const userPassword = await bcrypt.hash('user123', 10);
      
      const user = userRepository.create({
        email: 'user@auction.com',
        password: userPassword,
        name: 'Demo User',
        role: UserRole.USER,
      });

      await userRepository.save(user);
      console.log('✅ Regular user created');
    }
  }
}