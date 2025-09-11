import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Workflow } from './workflow.entity';

export enum StepType {
  INPUT = 'input',
  DECISION = 'decision',
  ACTION = 'action',
  INFORMATION = 'information',
  VALIDATION = 'validation',
  COMPLETION = 'completion',
}

export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

@Entity('workflow_steps')
export class WorkflowStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workflowId: string;

  @ManyToOne(() => Workflow, (workflow) => workflow.steps, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflowId' })
  workflow: Workflow;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: StepType,
    default: StepType.INPUT,
  })
  type: StepType;

  @Column()
  order: number;

  @Column({ type: 'text', nullable: true })
  prompt: string; // AI prompt for this step

  @Column({ type: 'json', nullable: true })
  config: Record<string, any>; // Step-specific configuration

  @Column({ type: 'json', nullable: true })
  validation: Record<string, any>; // Validation rules

  @Column({ type: 'simple-array', nullable: true })
  nextStepIds: string[]; // For branching workflows

  @Column({ type: 'json', nullable: true })
  conditions: Record<string, any>; // Conditions for step execution

  @Column({ default: false })
  isOptional: boolean;

  @Column({ default: 0 })
  estimatedDuration: number; // in minutes

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}