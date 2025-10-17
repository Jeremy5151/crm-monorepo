import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListLeadsDto {
  @IsOptional() @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['all', 'NEW', 'SENT', 'FAILED'])
  status?: string;

  @IsOptional() @IsString()
  aff?: string;

  @IsOptional() @IsString()
  bx?: string;

  @IsOptional() @IsString()
  country?: string;

  @IsOptional() @IsString()
  funnel?: string;

  @IsOptional() @IsString()
  createdDateRange?: string;

  @IsOptional() @IsString()
  sentDateRange?: string;

  @IsOptional() @IsString()
  createdDateFrom?: string;

  @IsOptional() @IsString()
  createdDateTo?: string;

  @IsOptional() @IsString()
  sentDateFrom?: string;

  @IsOptional() @IsString()
  sentDateTo?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : parseInt(value, 10)))
  @IsInt() @Min(1) @Max(200)
  take?: number;

  @IsOptional() @IsString()
  cursor?: string;
}
