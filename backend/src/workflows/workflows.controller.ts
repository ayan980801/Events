import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { StartWorkflowExecutionDto, StepExecutionInputDto, WorkflowExecutionActionDto } from './dto/workflow-execution.dto';

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  create(@Body() createWorkflowDto: CreateWorkflowDto, @Request() req) {
    return this.workflowsService.create(createWorkflowDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workflows' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'isTemplate', required: false, type: Boolean, description: 'Filter templates' })
  @ApiQuery({ name: 'myWorkflows', required: false, type: Boolean, description: 'Get only user workflows' })
  @ApiResponse({ status: 200, description: 'Workflows retrieved successfully' })
  findAll(
    @Query('category') category?: string,
    @Query('isTemplate') isTemplate?: boolean,
    @Query('myWorkflows') myWorkflows?: boolean,
    @Request() req?,
  ) {
    const userId = myWorkflows ? req.user.id : undefined;
    return this.workflowsService.findAll(userId, category, isTemplate);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get workflow templates' })
  @ApiResponse({ status: 200, description: 'Workflow templates retrieved successfully' })
  getTemplates(@Query('category') category?: string) {
    return this.workflowsService.findAll(undefined, category, true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  findOne(@Param('id') id: string) {
    return this.workflowsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  update(@Param('id') id: string, @Body() updateWorkflowDto: UpdateWorkflowDto, @Request() req) {
    return this.workflowsService.update(id, updateWorkflowDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({ status: 204, description: 'Workflow deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  remove(@Param('id') id: string, @Request() req) {
    return this.workflowsService.remove(id, req.user.id);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish workflow' })
  @ApiResponse({ status: 200, description: 'Workflow published successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  publish(@Param('id') id: string, @Request() req) {
    return this.workflowsService.publish(id, req.user.id);
  }

  // Workflow execution endpoints
  @Post('executions')
  @ApiOperation({ summary: 'Start workflow execution' })
  @ApiResponse({ status: 201, description: 'Workflow execution started successfully' })
  startExecution(@Body() dto: StartWorkflowExecutionDto, @Request() req) {
    return this.workflowsService.startExecution(dto, req.user.id);
  }

  @Get('executions/my')
  @ApiOperation({ summary: 'Get user workflow executions' })
  @ApiResponse({ status: 200, description: 'Workflow executions retrieved successfully' })
  getMyExecutions(@Request() req) {
    return this.workflowsService.getUserExecutions(req.user.id);
  }

  @Get('executions/:id')
  @ApiOperation({ summary: 'Get workflow execution by ID' })
  @ApiResponse({ status: 200, description: 'Workflow execution retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Workflow execution not found' })
  getExecution(@Param('id') id: string, @Request() req) {
    return this.workflowsService.getExecution(id, req.user.id);
  }

  @Post('executions/:id/steps')
  @ApiOperation({ summary: 'Execute current workflow step' })
  @ApiResponse({ status: 200, description: 'Step executed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid step execution' })
  executeStep(@Param('id') id: string, @Body() stepInput: StepExecutionInputDto, @Request() req) {
    return this.workflowsService.executeStep(id, stepInput, req.user.id);
  }

  @Post('executions/:id/actions')
  @ApiOperation({ summary: 'Perform action on workflow execution' })
  @ApiResponse({ status: 200, description: 'Action performed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid action' })
  performAction(@Param('id') id: string, @Body() action: WorkflowExecutionActionDto, @Request() req) {
    const { action: actionType } = action;
    
    switch (actionType) {
      case 'pause':
        return this.workflowsService.pauseExecution(id, req.user.id);
      case 'resume':
        return this.workflowsService.resumeExecution(id, req.user.id);
      case 'cancel':
        return this.workflowsService.cancelExecution(id, req.user.id);
      default:
        throw new Error('Invalid action');
    }
  }
}