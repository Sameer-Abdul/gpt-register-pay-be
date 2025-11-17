import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Register } from '../../register/entities/register.entity';

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Register, register => register.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'register_id' })
  register: Register;

  @Column({ name: 'register_id' })
  registerId: number;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'file_data', type: 'bytea', nullable: true })
  fileData: Buffer;

  @Column({ name: 'file_size' })
  fileSize: number;

  @Column({ name: 'file_type' })
  fileType: string;

  @Column({ name: 'submission_date', type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  submissionDate: Date;

  @Column({ name: 'created_at', type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ nullable: true })
  rating: number;

  @Column({ name: 'state', type: 'varchar', length: 100, nullable: true })
  state: string | null;

  @Column({ name: 'district', type: 'varchar', length: 100, nullable: true })
  district: string | null;

  @Column({ name: 'mandal', type: 'varchar', length: 100, nullable: true })
  mandal: string | null;

  @Column({ type: 'varchar', nullable: true })
  context: string | null;

  @Column({ name: 'first_name', type: 'varchar', nullable: true })
  firstName: string | null;

  @Column({ name: 'last_name', type: 'varchar', nullable: true })
  lastName: string | null;
}
