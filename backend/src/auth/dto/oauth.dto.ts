import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({
    example: 'ya29.a0ARrdaM9...',
    description: 'Google OAuth access token',
  })
  @IsString()
  token: string;
}

export class AppleAuthDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Apple Sign-In identity token',
  })
  @IsString()
  token: string;
}
