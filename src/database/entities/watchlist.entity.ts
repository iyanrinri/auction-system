import {
  Entity,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('watchlists')
@Index(['userId']) // Index untuk finding user's watchlist
@Index(['auctionId']) // Index untuk finding auction watchers
export class Watchlist {
  @PrimaryColumn({ name: 'user_id', type: 'bigint' })
  userId: string;

  @PrimaryColumn({ name: 'auction_id', type: 'bigint' })
  auctionId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne('User', 'watchlists')
  @JoinColumn({ name: 'user_id' })
  user: any;

  @ManyToOne('Auction', 'watchlists')
  @JoinColumn({ name: 'auction_id' })
  auction: any;
}