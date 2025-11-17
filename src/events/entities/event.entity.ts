import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Register } from '../../register/entities/register.entity';

@Entity('event')
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', length: 200 })
  name: string;

  @Column({ name: 'mode_of_event', length: 50, default: 'In-Person' })
  modeOfEvent: string;

  @Column({ name: 'date' })
  date: Date;

  @Column({ name: 'start_time' })
  startTime: string;

  @Column({ name: 'end_time' })
  endTime: string;

  @Column({ type: 'text' })
  venue: string;

  @Column({ name: 'latitude', length: 50, nullable: true })
  latitude?: string;

  @Column({ name: 'longitude', length: 50, nullable: true })
  longitude?: string;

  @Column({ name: 'organization_name', length: 200, nullable: true })
  organizationName?: string;

  @Column({ name: 'organization_contact', length: 15 })
  organizationContact: string;

  @Column({ name: 'organization_email', length: 100, nullable: true })
  organizationEmail?: string;

  @Column({ name: 'performance_type', length: 50, nullable: true })
  performanceType?: string;

  @Column({ name: 'created_by' })
  createdById: number;

  @ManyToOne(() => Register, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  createdBy: Register;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'event_coordinator', length: 100, nullable: true })
  eventCoordinator?: string;

  @Column({ name: 'additional_comments', type: 'text', nullable: true })
  additionalComments?: string;

  @Column({ name: 'organization_poc', type: 'text', nullable: true })
  organizationPoc?: string;

  // Zoom fields
  @Column({ name: 'zoom_meeting_id', type: 'text', nullable: true })
  zoomMeetingId?: string;

  @Column({ name: 'zoom_join_url', type: 'text', nullable: true })
  zoomJoinUrl?: string;

  @Column({ name: 'zoom_host_url', type: 'text', nullable: true })
  zoomHostUrl?: string;

  @Column({ name: 'zoom_password', type: 'text', nullable: true })
  zoomPassword?: string;
}
