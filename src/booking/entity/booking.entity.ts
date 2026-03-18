import { Suit } from 'src/suit/entity/suit.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  booking_created: string;
  @Column({ type: 'date' })
  start_at: string;
  @Column({ type: 'date' })
  end_at: string;
  @Column({ type: 'date', nullable: true })
  booking_return_suit: string;
  @Column({ type: 'date', nullable: true })
  booking_retired_suit: string;
  @Column({ type: 'date' })
  booking_date: string;
  @Column()
  booking_state: 'ACTIVED' | 'CANCELED' | 'COMPLETED' | 'INPROGRESS';
  @ManyToOne(() => Suit, (suit) => suit.bookings, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  suit: Suit;
  @Column()
  client_dni: string;
  @Column()
  client_name: string;
  @Column()
  client_phone: string;
  @Column()
  account_related: string;
  @Column()
  observations: string;
  @Column({ default: false })
  dressmaker: boolean;
}
