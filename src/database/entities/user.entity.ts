import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { IsEmail, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export enum UserRole {
  ADMIN = 'admin',
  SELLER = 'seller',
  USER = 'user',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'text', unique: true })
  @Index()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Column({ type: 'text' })
  @IsNotEmpty()
  password: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  name?: string;

  @Column({
    type: 'text',
    default: UserRole.USER,
  })
  @IsIn([UserRole.ADMIN, UserRole.SELLER, UserRole.USER])
  role: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'modified_at' })
  modifiedAt: Date;

  // Relations
  @OneToMany('Item', 'seller')
  items: any[];

  @OneToMany('Bid', 'bidder')
  bids: any[];

  @OneToMany('Payment', 'buyer')
  payments: any[];

  @OneToMany('Watchlist', 'user')
  watchlists: any[];
}