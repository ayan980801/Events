import { IsString, IsOptional, IsEnum, IsArray, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowCategory } from '../entities/workflow.entity';

export class CreateWorkflowStepDto {
  @ApiProperty({ description: 'Step name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Step description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Step type', enum: ['input', 'decision', 'action', 'information', 'validation', 'completion'] })
  @IsEnum(['input', 'decision', 'action', 'information', 'validation', 'completion'])
  type: string;

  @ApiProperty({ description: 'Step order in workflow' })
  @IsNumber()
  order: number;

  @ApiPropertyOptional({ description: 'AI prompt for this step' })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional({ description: 'Step configuration' })
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Validation rules' })
  @IsOptional()
  validation?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Next step IDs for branching' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nextStepIds?: string[];

  @ApiPropertyOptional({ description: 'Conditions for step execution' })
  @IsOptional()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether step is optional', default: false })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional({ description: 'Estimated duration in minutes', default: 0 })
  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;
}

export class CreateWorkflowDto {
  @ApiProperty({ description: 'Workflow name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Workflow description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Workflow category', enum: WorkflowCategory })
  @IsEnum(WorkflowCategory)
  category: WorkflowCategory;

  @ApiPropertyOptional({ description: 'Whether this is a template', default: false })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional({ description: 'Workflow metadata' })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Workflow instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Estimated duration in minutes', default: 0 })
  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @ApiProperty({ description: 'Workflow steps', type: [CreateWorkflowStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowStepDto)
  steps: CreateWorkflowStepDto[];
}