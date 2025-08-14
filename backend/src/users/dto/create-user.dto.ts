import { IsEmail, IsString, IsOptional, IsEnum, IsBoolean, IsUrl } from 'class-validator';
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

  @ApiProperty({ example: 'google_user_123', required: false })
  @IsOptional()
  @IsString()
  googleId?: string;

  @ApiProperty({ example: 'apple_user_456', required: false })
  @IsOptional()
  @IsString()
  appleId?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsOptional()
  @IsUrl()
  profilePicture?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;
}
