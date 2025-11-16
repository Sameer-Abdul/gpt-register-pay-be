import { IsString, IsEmail, IsPhoneNumber, IsIn, IsDateString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateRegisterDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsPhoneNumber('IN')
  @IsNotEmpty()
  mobileNo: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  maritalStatus: string;

  @IsOptional()
  @IsDateString()
  marriageDate?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsIn(['Male', 'Female', 'Other'])
  gender: string;

  @IsString()
  @IsOptional()
  course: string = 'Award Nomination';

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  district: string;

  @IsString()
  @IsNotEmpty()
  mandal: string;

  @IsString()
  @IsNotEmpty()
  designation: string;

  @IsString()
  @IsNotEmpty()
  highestClassITeach: string;

  @IsString()
  @IsNotEmpty()
  schoolCorrespondentName: string;

  @IsString()
  @IsNotEmpty()
  schoolCorrespondentPhone: string;

  @IsEmail()
  @IsNotEmpty()
  schoolCorrespondentEmail: string;
}
