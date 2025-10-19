import { IsEmail, IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsString()
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  // Права доступа
  @IsOptional()
  @IsBoolean()
  canViewBrokers?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewBoxes?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewUsers?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewFullEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewFullPhone?: boolean;

  @IsOptional()
  @IsBoolean()
  canResendLeads?: boolean;
}
