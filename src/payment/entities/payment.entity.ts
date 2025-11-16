import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, JoinColumn, OneToOne } from 'typeorm';
import { Register } from '../../register/entities/register.entity';

@Entity('payment')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'registration_id' })
  registrationId: number;

  @Column({ name: 'utr_number', length: 12 })
  utrNumber: string;

  @Column({ type: 'bytea' })
  screenshot: Buffer;

  @Column({ name: 'screenshot_mime_type', length: 100, nullable: true })
  screenshotMimeType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => Register, register => register.payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'registration_id' })
  registration: Register;
}
