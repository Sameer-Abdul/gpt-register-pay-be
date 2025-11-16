// src/register/entities/register.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn, OneToMany, ManyToOne } from 'typeorm';
import { Payment } from '../../modules/payments/entities/payment.entity';
import { Assignment } from '../../assignments/entities/assignment.entity';
import { Location } from '../../locations/entities/location.entity';

@Entity('register')
export class Register {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Assignment, assignment => assignment.register)
  assignments: Assignment[];

  @Column({ name: 'middle_name', nullable: true })
  middleName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'mobile_no' })
  mobileNo: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'marital_status' })
  maritalStatus: string;

  @Column({ 
    name: 'marriage_date', 
    type: 'timestamp with time zone', 
    nullable: true 
  })
  marriageDate?: Date;

  @Column({ type: 'text' })
  address: string;

  @Column()
  gender: string;

  @Column({ default: 'Award Nomination' })
  course: string;

  @Column({ type: 'varchar', length: 100 })
  state: string;

  @Column({ type: 'varchar', length: 100 })
  district: string;

  @Column({ type: 'varchar', length: 100 })
  mandal: string;

  @Column()
  designation: string;

  @Column({ name: 'highest_class_i_teach' })
  highestClassITeach: string;

  @Column({ name: 'school_correspondent_name' })
  schoolCorrespondentName: string;

  @Column({ name: 'school_correspondent_phone' })
  schoolCorrespondentPhone: string;

  @Column({ name: 'school_correspondent_email' })
  schoolCorrespondentEmail: string;

  @Column({ name: 'utr_number', nullable: true })
  utrNumber: string;

  @Column({ name: 'payment_screenshot', type: 'bytea', nullable: true })
  paymentScreenshot: Buffer;

  @Column({ name: 'screenshot_mime_type', nullable: true })
  screenshotMimeType: string;

  @Column({ name: 'password_hash', nullable: false })
  passwordHash: string;

  @Column({ name: 'tenant_id', nullable: false })
  tenantId: string;

  @Column({ default: 'user' })
  role: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId: string | null;

  @ManyToOne(() => Location, location => location.registers, { 
    onDelete: 'SET NULL',
    eager: true,
    nullable: true 
  })
  @JoinColumn({ name: 'location_id' })
  location: Location | null;

  @OneToOne(() => Payment, payment => payment.register, {
    onDelete: 'SET NULL',
    nullable: true
  })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment | null;
}