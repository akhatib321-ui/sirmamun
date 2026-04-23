import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index } from 'typeorm';

@Entity('stock')
@Index(['iid', 'lid'], { unique: true })
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  iid: string; // item id

  @Column()
  lid: string; // location id

  @Column({ default: 0 })
  qty: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
