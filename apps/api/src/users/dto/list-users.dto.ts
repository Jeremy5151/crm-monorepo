import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { UserRole } from '@prisma/client';

export class ListUsersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  take?: string;

  @IsOptional()
  @IsString()
  skip?: string;
}
