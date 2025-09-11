import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow, WorkflowStatus } from './entities/workflow.entity';
import { WorkflowStep } from './entities/workflow-step.entity';
import { WorkflowExecution, WorkflowExecutionStatus } from './entities/workflow-execution.entity';
import { WorkflowStepExecution } from './entities/workflow-step-execution.entity';
import { StepStatus } from './entities/workflow-step-execution.entity';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { StartWorkflowExecutionDto, StepExecutionInputDto } from './dto/workflow-execution.dto';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    @InjectRepository(Workflow)
    private workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowStep)
    private workflowStepRepository: Repository<WorkflowStep>,
    @InjectRepository(WorkflowExecution)
    private workflowExecutionRepository: Repository<WorkflowExecution>,
    @InjectRepository(WorkflowStepExecution)
    private workflowStepExecutionRepository: Repository<WorkflowStepExecution>,
  ) {}

  // Workflow CRUD operations
  async create(createWorkflowDto: CreateWorkflowDto, userId: string): Promise<Workflow> {
    const { steps, ...workflowData } = createWorkflowDto;
    
    const workflow = this.workflowRepository.create({
      ...workflowData,
      createdBy: userId,
    });

    const savedWorkflow = await this.workflowRepository.save(workflow);

    // Create workflow steps
    const workflowSteps = steps.map((stepDto) =>
      this.workflowStepRepository.create({
        ...stepDto,
        workflowId: savedWorkflow.id,
        type: stepDto.type as any, // Cast to enum
      }),
    );

    const savedSteps = await this.workflowStepRepository.save(workflowSteps);
    savedWorkflow.steps = savedSteps;
    
    return savedWorkflow;
  }

  async findAll(userId?: string, category?: string, isTemplate?: boolean): Promise<Workflow[]> {
    const queryBuilder = this.workflowRepository.createQueryBuilder('workflow')
      .leftJoinAndSelect('workflow.steps', 'steps')
      .where('workflow.status = :status', { status: WorkflowStatus.PUBLISHED })
      .orderBy('workflow.createdAt', 'DESC');

    if (userId) {
      queryBuilder.andWhere('workflow.createdBy = :userId', { userId });
    }

    if (category) {
      queryBuilder.andWhere('workflow.category = :category', { category });
    }

    if (isTemplate !== undefined) {
      queryBuilder.andWhere('workflow.isTemplate = :isTemplate', { isTemplate });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string): Promise<Workflow> {
    const workflow = await this.workflowRepository.findOne({
      where: { id },
      relations: ['steps'],
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return workflow;
  }

  async update(id: string, updateWorkflowDto: UpdateWorkflowDto, userId: string): Promise<Workflow> {
    const workflow = await this.findOne(id);

    if (workflow.createdBy !== userId) {
      throw new BadRequestException('You can only update workflows you created');
    }

    // Update workflow properties
    Object.assign(workflow, updateWorkflowDto);

    // Update steps if provided
    if (updateWorkflowDto.steps) {
      // Remove existing steps
      await this.workflowStepRepository.delete({ workflowId: id });

      // Create new steps
      const steps = updateWorkflowDto.steps.map((stepDto) =>
        this.workflowStepRepository.create({
          ...stepDto,
          workflowId: id,
          type: stepDto.type as any, // Cast to enum
        }),
      );

      workflow.steps = await this.workflowStepRepository.save(steps);
    }

    return this.workflowRepository.save(workflow);
  }

  async remove(id: string, userId: string): Promise<void> {
    const workflow = await this.findOne(id);

    if (workflow.createdBy !== userId) {
      throw new BadRequestException('You can only delete workflows you created');
    }

    await this.workflowRepository.delete(id);
  }

  async publish(id: string, userId: string): Promise<Workflow> {
    const workflow = await this.findOne(id);

    if (workflow.createdBy !== userId) {
      throw new BadRequestException('You can only publish workflows you created');
    }

    workflow.status = WorkflowStatus.PUBLISHED;
    return this.workflowRepository.save(workflow);
  }

  // Workflow execution operations
  async startExecution(dto: StartWorkflowExecutionDto, userId: string): Promise<WorkflowExecution> {
    const workflow = await this.findOne(dto.workflowId);

    if (workflow.status !== WorkflowStatus.PUBLISHED) {
      throw new BadRequestException('Only published workflows can be executed');
    }

    // Create workflow execution
    const execution = this.workflowExecutionRepository.create({
      workflowId: dto.workflowId,
      userId,
      status: WorkflowExecutionStatus.IN_PROGRESS,
      context: dto.context || {},
      startedAt: new Date(),
    });

    const savedExecution = await this.workflowExecutionRepository.save(execution);

    // Create step executions for all steps
    const stepExecutions = workflow.steps
      .sort((a, b) => a.order - b.order)
      .map((step) =>
        this.workflowStepExecutionRepository.create({
          workflowExecutionId: savedExecution.id,
          stepId: step.id,
          stepName: step.name,
          stepOrder: step.order,
          status: StepStatus.PENDING,
        }),
      );

    await this.workflowStepExecutionRepository.save(stepExecutions);

    // Set current step to first step
    const firstStep = stepExecutions[0];
    if (firstStep) {
      savedExecution.currentStepId = firstStep.stepId;
      firstStep.status = StepStatus.IN_PROGRESS;
      firstStep.startedAt = new Date();
      await this.workflowStepExecutionRepository.save(firstStep);
      await this.workflowExecutionRepository.save(savedExecution);
    }

    return this.getExecutionWithDetails(savedExecution.id);
  }

  async getExecution(id: string, userId: string): Promise<WorkflowExecution> {
    const execution = await this.workflowExecutionRepository.findOne({
      where: { id, userId },
      relations: ['workflow', 'stepExecutions'],
    });

    if (!execution) {
      throw new NotFoundException(`Workflow execution with ID ${id} not found`);
    }

    return execution;
  }

  async getUserExecutions(userId: string): Promise<WorkflowExecution[]> {
    return this.workflowExecutionRepository.find({
      where: { userId },
      relations: ['workflow'],
      order: { createdAt: 'DESC' },
    });
  }

  async executeStep(executionId: string, stepInput: StepExecutionInputDto, userId: string): Promise<WorkflowExecution> {
    const execution = await this.getExecution(executionId, userId);

    if (execution.status !== WorkflowExecutionStatus.IN_PROGRESS) {
      throw new BadRequestException('Workflow execution is not in progress');
    }

    // Find current step execution
    const currentStepExecution = execution.stepExecutions.find(
      (se) => se.stepId === execution.currentStepId && se.status === StepStatus.IN_PROGRESS,
    );

    if (!currentStepExecution) {
      throw new BadRequestException('No current step in progress');
    }

    // Update current step execution
    currentStepExecution.userInput = stepInput.userInput;
    currentStepExecution.output = stepInput.data || {};
    currentStepExecution.status = StepStatus.COMPLETED;
    currentStepExecution.completedAt = new Date();

    await this.workflowStepExecutionRepository.save(currentStepExecution);

    // Move to next step
    await this.moveToNextStep(execution);

    return this.getExecutionWithDetails(executionId);
  }

  async pauseExecution(id: string, userId: string): Promise<WorkflowExecution> {
    const execution = await this.getExecution(id, userId);

    if (execution.status !== WorkflowExecutionStatus.IN_PROGRESS) {
      throw new BadRequestException('Can only pause in-progress executions');
    }

    execution.status = WorkflowExecutionStatus.PAUSED;
    execution.pausedAt = new Date();

    return this.workflowExecutionRepository.save(execution);
  }

  async resumeExecution(id: string, userId: string): Promise<WorkflowExecution> {
    const execution = await this.getExecution(id, userId);

    if (execution.status !== WorkflowExecutionStatus.PAUSED) {
      throw new BadRequestException('Can only resume paused executions');
    }

    execution.status = WorkflowExecutionStatus.IN_PROGRESS;
    execution.pausedAt = null;

    return this.workflowExecutionRepository.save(execution);
  }

  async cancelExecution(id: string, userId: string): Promise<WorkflowExecution> {
    const execution = await this.getExecution(id, userId);

    if ([WorkflowExecutionStatus.COMPLETED, WorkflowExecutionStatus.CANCELLED].includes(execution.status)) {
      throw new BadRequestException('Cannot cancel completed or already cancelled executions');
    }

    execution.status = WorkflowExecutionStatus.CANCELLED;
    execution.completedAt = new Date();

    return this.workflowExecutionRepository.save(execution);
  }

  // Private helper methods
  private async moveToNextStep(execution: WorkflowExecution): Promise<void> {
    const currentOrder = execution.stepExecutions.find(se => se.stepId === execution.currentStepId)?.stepOrder;
    
    if (currentOrder === undefined) {
      throw new BadRequestException('Current step not found');
    }

    // Find next step
    const nextStepExecution = execution.stepExecutions
      .filter(se => se.stepOrder > currentOrder && se.status === StepStatus.PENDING)
      .sort((a, b) => a.stepOrder - b.stepOrder)[0];

    if (nextStepExecution) {
      // Move to next step
      execution.currentStepId = nextStepExecution.stepId;
      nextStepExecution.status = StepStatus.IN_PROGRESS;
      nextStepExecution.startedAt = new Date();

      await this.workflowStepExecutionRepository.save(nextStepExecution);
      await this.workflowExecutionRepository.save(execution);
    } else {
      // No more steps, complete workflow
      execution.status = WorkflowExecutionStatus.COMPLETED;
      execution.completedAt = new Date();
      execution.currentStepId = null;

      await this.workflowExecutionRepository.save(execution);
    }
  }

  private async getExecutionWithDetails(id: string): Promise<WorkflowExecution> {
    return this.workflowExecutionRepository.findOne({
      where: { id },
      relations: ['workflow', 'workflow.steps', 'stepExecutions'],
    });
  }
}