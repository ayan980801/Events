import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Workflow } from './workflow.entity';
import { WorkflowStepExecution } from './workflow-step-execution.entity';

export enum WorkflowExecutionStatus {
  CREATED = 'created',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('workflow_executions')
export class WorkflowExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workflowId: string;

  @ManyToOne(() => Workflow)
  @JoinColumn({ name: 'workflowId' })
  workflow: Workflow;

  @Column()
  userId: string; // User executing the workflow

  @Column({
    type: 'enum',
    enum: WorkflowExecutionStatus,
    default: WorkflowExecutionStatus.CREATED,
  })
  status: WorkflowExecutionStatus;

  @Column({ nullable: true })
  currentStepId: string;

  @Column({ type: 'json', nullable: true })
  context: Record<string, any>; // Workflow execution context/variables

  @Column({ type: 'json', nullable: true })
  result: Record<string, any>; // Final workflow result

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  pausedAt: Date;

  @OneToMany(() => WorkflowStepExecution, (stepExecution) => stepExecution.workflowExecution, {
    cascade: true,
    eager: true,
  })
  stepExecutions: WorkflowStepExecution[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}