import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsIn, IsNumber, Min } from 'class-validator';

export enum AuctionStatus {
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

@Entity('auctions')
@Index(['status']) // Index untuk filtering by status
@Index(['startAt']) // Index untuk sorting by start time
@Index(['endAt']) // Index untuk sorting by end time
@Index(['status', 'startAt']) // Composite index untuk active auctions
@Index(['status', 'endAt']) // Composite index untuk ending auctions
@Index(['startingPrice']) // Index untuk filtering by price range
export class Auction {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'item_id', type: 'bigint', unique: true })
  @Index()
  itemId: string;

  @Column({ name: 'starting_price', type: 'numeric', precision: 12, scale: 2 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  startingPrice: number;

  @Column({
    name: 'reserve_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reservePrice?: number;

  @Column({
    name: 'buy_now_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  buyNowPrice?: number;

  @Column({
    name: 'min_increment',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 10000.00,
  })
  @IsNumber()
  @Min(0)
  minIncrement: number;

  @Column({ name: 'start_at', type: 'timestamp with time zone' })
  @IsNotEmpty()
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamp with time zone' })
  @IsNotEmpty()
  endAt: Date;

  @Column({
    type: 'text',
    default: AuctionStatus.SCHEDULED,
  })
  @IsIn([
    AuctionStatus.SCHEDULED,
    AuctionStatus.RUNNING,
    AuctionStatus.ENDED,
    AuctionStatus.CANCELLED,
  ])
  status: AuctionStatus;

  @Column({ name: 'auto_extend_seconds', type: 'int', default: 0 })
  @IsNumber()
  @Min(0)
  autoExtendSeconds: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'modified_at' })
  modifiedAt: Date;

  // Relations
  @OneToOne('Item', 'auction')
  @JoinColumn({ name: 'item_id' })
  item: any;

  @OneToMany('Bid', 'auction')
  bids: any[];

  @OneToMany('Payment', 'auction')
  payments: any[];

  @OneToMany('Watchlist', 'auction')
  watchlists: any[];
}