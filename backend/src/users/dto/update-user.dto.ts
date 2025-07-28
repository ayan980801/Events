import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  defaultModel?: string;

  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}