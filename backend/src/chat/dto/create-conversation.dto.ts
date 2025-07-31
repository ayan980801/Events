import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ example: 'My new conversation' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'gpt-4', required: false })
  @IsOptional()
  @IsString()
  aiModel?: string;
}
