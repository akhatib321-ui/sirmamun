import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('app_settings')
export class AppSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'simple-json' })
  config: Record<string, any>;
}
