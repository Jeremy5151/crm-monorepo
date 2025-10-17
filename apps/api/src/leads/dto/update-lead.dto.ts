import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpdateLeadDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @Length(1, 100)
  firstName?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() @Length(1, 100)
  lastName?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsEmail()
  email?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() @Length(5, 50)
  phone?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  ip?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() @Length(2, 2)
  country?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  bx?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  funnel?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  comment?: string;
}
