import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ enum: AuthProvider, default: AuthProvider.EMAIL })
  @IsEnum(AuthProvider)
  provider: AuthProvider;

  @ApiProperty({ example: '123456789', required: false })
  @IsOptional()
  @IsString()
  providerId?: string;
}