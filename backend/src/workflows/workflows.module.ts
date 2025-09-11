import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { WorkflowExecutionEngine } from './workflow-execution.engine';
import { WorkflowTemplateService } from './workflow-template.service';
import { Workflow } from './entities/workflow.entity';
import { WorkflowStep } from './entities/workflow-step.entity';
import { WorkflowExecution } from './entities/workflow-execution.entity';
import { WorkflowStepExecution } from './entities/workflow-step-execution.entity';
import { AiProvidersModule } from '../ai-providers/ai-providers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workflow,
      WorkflowStep,
      WorkflowExecution,
      WorkflowStepExecution,
    ]),
    AiProvidersModule,
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowExecutionEngine, WorkflowTemplateService],
  exports: [WorkflowsService, WorkflowExecutionEngine, WorkflowTemplateService],
})
export class WorkflowsModule {}