import { IsString, IsNumber, IsArray, ValidateNested, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ScoreEntryDto {
  @ApiProperty()
  @IsUUID()
  student_id: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  score: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  max_score: number;
}

export class BulkScoreEntryDto {
  @ApiProperty()
  @IsUUID()
  class_subject_id: string;

  @ApiProperty()
  @IsUUID()
  term_id: string;

  @ApiProperty()
  @IsUUID()
  assessment_type_id: string;

  @ApiProperty({ type: [ScoreEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreEntryDto)
  scores: ScoreEntryDto[];
}

export class ProcessResultsDto {
  @ApiProperty()
  @IsUUID()
  term_id: string;

  @ApiProperty()
  @IsUUID()
  class_id: string;
}

export class PublishResultsDto {
  @ApiProperty()
  @IsUUID()
  term_id: string;

  @ApiProperty()
  @IsUUID()
  class_id: string;

  @ApiProperty()
  send_notifications: boolean = true;
}

export class GradeRule {
  min_score: number;
  max_score: number;
  grade: string;
  remark: string;
  points: number;
}
