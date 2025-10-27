import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsNumber, Min, IsBoolean } from 'class-validator';

@Entity('bids')
@Index(['auctionId', 'createdAt'])
export class Bid {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'auction_id', type: 'bigint' })
  @Index()
  auctionId: string;

  @Column({ name: 'bidder_id', type: 'bigint' })
  @Index()
  bidderId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @Column({ name: 'is_auto', type: 'boolean', default: false })
  @IsBoolean()
  isAuto: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'modified_at' })
  modifiedAt: Date;

  // Relations
  @ManyToOne('Auction', 'bids')
  @JoinColumn({ name: 'auction_id' })
  auction: any;

  @ManyToOne('User', 'bids')
  @JoinColumn({ name: 'bidder_id' })
  bidder: any;
}