import { IsString, IsDateString, IsNotEmpty, IsOptional, IsPhoneNumber, IsIn, IsNumber } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsIn(['In-Person', 'Online', 'Hybrid'])
  @IsOptional()
  mode_of_event?: string = 'In-Person';

  @IsDateString()
  @IsNotEmpty()
  date: Date;

  @IsString()
  @IsNotEmpty()
  start_time: string;

  @IsString()
  @IsNotEmpty()
  end_time: string;

  @IsString()
  @IsNotEmpty()
  venue: string;

  @IsString()
  @IsOptional()
  latitude?: string;

  @IsString()
  @IsOptional()
  longitude?: string;

  @IsString()
  @IsOptional()
  organization_name?: string;

  @IsString()
  @IsPhoneNumber('IN')
  @IsNotEmpty()
  organization_contact: string;

  @IsString()
  @IsOptional()
  organization_email?: string;

  @IsString()
  @IsOptional()
  performance_type?: string;

  @IsNumber()
  @IsNotEmpty()
  created_by: number;

  @IsString()
  @IsOptional()
  event_coordinator?: string;

  @IsString()
  @IsOptional()
  additional_comments?: string;

  @IsString()
  @IsOptional()
  organization_poc?: string;

  // Zoom fields
  @IsString()
  @IsOptional()
  zoom_meeting_id?: string;

  @IsString()
  @IsOptional()
  zoom_join_url?: string;

  @IsString()
  @IsOptional()
  zoom_host_url?: string;

  @IsString()
  @IsOptional()
  zoom_password?: string;
}
