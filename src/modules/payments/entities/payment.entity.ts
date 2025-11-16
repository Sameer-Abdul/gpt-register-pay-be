// src/modules/payments/entities/payment.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Register } from '../../../register/entities/register.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'utr_number', type: 'varchar', length: 50 })
  utrNumber: string;

  @Column({ name: 'screenshot_path', type: 'varchar', nullable: true })
  screenshotPath: string;

  @Column({ name: 'screenshot_mime_type', type: 'varchar', nullable: true })
  screenshotMimeType: string;

  @Column({ name: 'original_filename', type: 'varchar', nullable: true })
  originalFilename: string;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Register, register => register.payment, { 
    onDelete: 'CASCADE',
    nullable: true
  })
  @JoinColumn({ name: 'register_id' })
  register: Register;

  // This is the actual foreign key column
  @Column({ name: 'register_id', nullable: true })
  registerId: number;
}