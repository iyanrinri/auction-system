import {
  Entity,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('watchlists')
export class Watchlist {
  @PrimaryColumn({ name: 'user_id', type: 'bigint' })
  userId: string;

  @PrimaryColumn({ name: 'auction_id', type: 'bigint' })
  auctionId: string;

  // Relations
  @ManyToOne('User', 'watchlists')
  @JoinColumn({ name: 'user_id' })
  user: any;

  @ManyToOne('Auction', 'watchlists')
  @JoinColumn({ name: 'auction_id' })
  auction: any;
}