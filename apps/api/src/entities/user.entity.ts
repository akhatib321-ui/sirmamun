import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  pin: string; // stored as plain 4-digit for simplicity; swap for bcrypt when adding full auth

  @Column({ default: 'staff' }) // 'admin' | 'staff'
  role: string;

  @Column({ type: 'int', default: 1 })
  organizationId: number;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'simple-json', default: '[]' })
  locationIds: string[];

  @CreateDateColumn()
  createdAt: Date;
}
