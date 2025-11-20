import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('tenant_master')
export class Tenant {
  @PrimaryColumn()
  tenant_id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  contact_no: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  image_left: string;

  @Column({ nullable: true })
  image_right: string;

  @Column({ default: 'AUTO' })
  header_format: string;

  @Column({ type: 'text', nullable: true })
  header_custom_lines: string;
}

export class TenantHeaderResponse {
  success: boolean;
  data: {
    tenantId: string;
    name: string;
    imageLeft: string;
    imageRight: string;
    header_format: string;
    header_custom_lines: string;
  };
}
