import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('ip_records')
export class IpRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  ip: string;

  @Column({ default: 0 })
  requestCount: number;

  @Column({ type: 'datetime', nullable: true })
  windowStart: Date;

  @Column({ type: 'datetime', nullable: true })
  windowEnd: Date;

  @Column({ default: false })
  isBlocked: boolean;

  @Column({ type: 'datetime', nullable: true })
  blockedUntil: Date | null;
}
