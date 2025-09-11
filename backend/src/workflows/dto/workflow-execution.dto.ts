import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartWorkflowExecutionDto {
  @ApiProperty({ description: 'Workflow ID to execute' })
  @IsUUID()
  workflowId: string;

  @ApiPropertyOptional({ description: 'Initial context/variables for workflow execution' })
  @IsOptional()
  context?: Record<string, any>;
}

export class StepExecutionInputDto {
  @ApiProperty({ description: 'User input for the current step' })
  @IsString()
  userInput: string;

  @ApiPropertyOptional({ description: 'Additional data for step execution' })
  @IsOptional()
  data?: Record<string, any>;
}

export class WorkflowExecutionActionDto {
  @ApiProperty({ description: 'Action to perform', enum: ['pause', 'resume', 'cancel'] })
  @IsString()
  action: 'pause' | 'resume' | 'cancel';
}