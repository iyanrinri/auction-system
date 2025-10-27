import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { IsNotEmpty, IsOptional } from 'class-validator';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'seller_id', type: 'bigint' })
  sellerId: string;

  @Column({ type: 'text' })
  @IsNotEmpty()
  title: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'modified_at' })
  modifiedAt: Date;

  // Relations
  @ManyToOne('User', 'items')
  @JoinColumn({ name: 'seller_id' })
  seller: any;

  @OneToOne('Auction', 'item')
  auction: any;
}