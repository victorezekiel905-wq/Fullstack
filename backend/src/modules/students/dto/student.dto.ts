import { IsString, IsEmail, IsOptional, IsDateString, IsEnum, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  admission_number?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  first_name: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  last_name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  middle_name?: string;

  @ApiProperty()
  @IsDateString()
  date_of_birth: string;

  @ApiProperty({ enum: ['male', 'female'] })
  @IsEnum(['male', 'female'])
  gender: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  current_class_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state_of_origin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lga?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  blood_group?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  genotype?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medical_conditions?: string;

  // Parent information
  @ApiProperty()
  @IsEmail()
  parent_email: string;

  @ApiProperty()
  @IsString()
  parent_first_name: string;

  @ApiProperty()
  @IsString()
  parent_last_name: string;

  @ApiProperty()
  @IsString()
  parent_phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parent_relationship?: string;
}

export class UpdateStudentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  middle_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  current_class_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medical_conditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['active', 'graduated', 'withdrawn', 'suspended'])
  status?: string;
}

export class BulkImportStudentDto {
  @ApiProperty()
  admission_number: string;

  @ApiProperty()
  first_name: string;

  @ApiProperty()
  last_name: string;

  @ApiPropertyOptional()
  middle_name?: string;

  @ApiProperty()
  date_of_birth: string;

  @ApiProperty()
  gender: string;

  @ApiProperty()
  class_name: string;

  @ApiProperty()
  parent_email: string;

  @ApiProperty()
  parent_name: string;

  @ApiProperty()
  parent_phone: string;
}
