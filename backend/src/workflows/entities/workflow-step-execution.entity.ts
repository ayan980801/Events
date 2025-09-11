import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkflowExecution } from './workflow-execution.entity';

export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

@Entity('workflow_step_executions')
export class WorkflowStepExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workflowExecutionId: string;

  @ManyToOne(() => WorkflowExecution, (execution) => execution.stepExecutions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflowExecutionId' })
  workflowExecution: WorkflowExecution;

  @Column()
  stepId: string; // Reference to WorkflowStep

  @Column()
  stepName: string;

  @Column()
  stepOrder: number;

  @Column({
    type: 'enum',
    enum: StepStatus,
    default: StepStatus.PENDING,
  })
  status: StepStatus;

  @Column({ type: 'json', nullable: true })
  input: Record<string, any>; // Input data for this step

  @Column({ type: 'json', nullable: true })
  output: Record<string, any>; // Output data from this step

  @Column({ type: 'text', nullable: true })
  aiResponse: string; // AI-generated response for this step

  @Column({ type: 'text', nullable: true })
  userInput: string; // User input for this step

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ default: 0 })
  retryCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}