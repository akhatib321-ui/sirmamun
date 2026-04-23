import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('log')
export class Log {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  ts: number;

  @Column() // 'adj' | 'xfr'
  type: string;

  @Column()
  iid: string;

  // adj fields
  @Column({ nullable: true })
  lid: string;

  @Column({ nullable: true, type: 'int' })
  delta: number;

  @Column({ nullable: true, type: 'int' })
  fromQty: number;

  @Column({ nullable: true, type: 'int' })
  toQty: number;

  @Column({ nullable: true })
  note: string;

  // xfr fields
  @Column({ nullable: true })
  fromLid: string;

  @Column({ nullable: true })
  toLid: string;

  @Column({ nullable: true, type: 'int' })
  qty: number;
}
