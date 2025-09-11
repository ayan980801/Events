import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { WorkflowStep } from './workflow-step.entity';

export enum WorkflowStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum WorkflowCategory {
  TASK_MANAGEMENT = 'task_management',
  DECISION_MAKING = 'decision_making',
  PLANNING = 'planning',
  PROBLEM_SOLVING = 'problem_solving',
  LEARNING = 'learning',
  BRAINSTORMING = 'brainstorming',
  CUSTOM = 'custom',
}

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: WorkflowCategory,
    default: WorkflowCategory.CUSTOM,
  })
  category: WorkflowCategory;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.DRAFT,
  })
  status: WorkflowStatus;

  @Column({ default: false })
  isTemplate: boolean;

  @Column({ nullable: true })
  createdBy: string; // User ID

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  instructions: string;

  @Column({ default: 0 })
  estimatedDuration: number; // in minutes

  @OneToMany(() => WorkflowStep, (step) => step.workflow, {
    cascade: true,
    eager: true,
  })
  steps: WorkflowStep[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}