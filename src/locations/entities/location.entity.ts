import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Register } from '../../register/entities/register.entity';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  state: string;

  @Column({ type: 'varchar', length: 100 })
  district: string;

  @Column({ type: 'varchar', length: 100 })
  mandal: string;

  @OneToMany(() => Register, (register) => register.location, {
    cascade: true,
    onDelete: 'SET NULL'
  })
  registers: Register[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  constructor(partial?: Partial<Location>) {
    Object.assign(this, partial);
  }
}
