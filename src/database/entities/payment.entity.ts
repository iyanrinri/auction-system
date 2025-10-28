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
import { IsNotEmpty, IsNumber, Min, IsIn, IsOptional } from 'class-validator';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('payments')
@Index(['status']) // Index untuk filtering by payment status
@Index(['createdAt']) // Index untuk sorting by payment date
@Index(['buyerId', 'status']) // Composite index untuk user's payment history
@Index(['auctionId', 'status']) // Composite index untuk auction payments
@Index(['status', 'createdAt']) // Composite index untuk payment status timeline
export class Payment {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'auction_id', type: 'bigint' })
  @Index()
  auctionId: string;

  @Column({ name: 'buyer_id', type: 'bigint' })
  @Index()
  buyerId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @Column({
    type: 'text',
    default: PaymentStatus.PENDING,
  })
  @IsIn([
    PaymentStatus.PENDING,
    PaymentStatus.PAID,
    PaymentStatus.FAILED,
    PaymentStatus.REFUNDED,
  ])
  status: PaymentStatus;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  provider?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'modified_at' })
  modifiedAt: Date;

  // Relations
  @ManyToOne('Auction', 'payments')
  @JoinColumn({ name: 'auction_id' })
  auction: any;

  @ManyToOne('User', 'payments')
  @JoinColumn({ name: 'buyer_id' })
  buyer: any;
}