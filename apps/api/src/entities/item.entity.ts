import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  uom: string;

  @Column({ nullable: true, default: '' })
  desc: string;

  @Column({ nullable: true, default: '' })
  supplier: string;

  @Column({ default: 2 })
  lowAt: number;

  @CreateDateColumn()
  createdAt: Date;
}
