import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('telegram_links')
@Index(['chatId'], { unique: true })
@Index(['phoneNumber'])
export class TelegramLink {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'chat_id', type: 'bigint' })
  chatId: number;

  @Column({ name: 'phone_number', length: 20 })
  phoneNumber: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
