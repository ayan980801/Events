import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { AiProvidersService } from '../ai-providers/ai-providers.service';
import { WorkflowExecution } from './entities/workflow-execution.entity';
import { WorkflowStepExecution } from './entities/workflow-step-execution.entity';
import { StepType } from './entities/workflow-step.entity';

export interface WorkflowStepResult {
  success: boolean;
  aiResponse?: string;
  output?: Record<string, any>;
  error?: string;
  nextStepId?: string;
}

@Injectable()
export class WorkflowExecutionEngine {
  private readonly logger = new Logger(WorkflowExecutionEngine.name);

  constructor(
    @Inject(forwardRef(() => WorkflowsService))
    private workflowsService: WorkflowsService,
    private aiProvidersService: AiProvidersService,
  ) {}

  async processStep(
    execution: WorkflowExecution,
    stepExecution: WorkflowStepExecution,
    userInput?: string,
  ): Promise<WorkflowStepResult> {
    try {
      const workflowStep = execution.workflow.steps.find(s => s.id === stepExecution.stepId);
      
      if (!workflowStep) {
        throw new Error(`Workflow step ${stepExecution.stepId} not found`);
      }

      this.logger.log(`Processing step: ${workflowStep.name} (${workflowStep.type})`);

      let aiResponse = '';
      let output: Record<string, any> = {};

      // Generate AI response based on step type and prompt
      if (workflowStep.prompt) {
        const contextualPrompt = this.buildContextualPrompt(
          workflowStep.prompt,
          execution.context,
          stepExecution,
          userInput,
        );

        try {
          aiResponse = await this.generateAIResponse(contextualPrompt, execution.userId);
        } catch (error) {
          this.logger.error(`AI response generation failed: ${error.message}`);
          aiResponse = `I apologize, but I encountered an error while processing this step. Please try again or contact support.`;
        }
      }

      // Process step based on type
      switch (workflowStep.type) {
        case StepType.INPUT:
          output = await this.processInputStep(workflowStep, userInput, execution.context);
          break;
        case StepType.DECISION:
          output = await this.processDecisionStep(workflowStep, userInput, execution.context);
          break;
        case StepType.ACTION:
          output = await this.processActionStep(workflowStep, userInput, execution.context);
          break;
        case StepType.INFORMATION:
          output = await this.processInformationStep(workflowStep, execution.context);
          break;
        case StepType.VALIDATION:
          output = await this.processValidationStep(workflowStep, userInput, execution.context);
          break;
        case StepType.COMPLETION:
          output = await this.processCompletionStep(workflowStep, execution.context);
          break;
        default:
          throw new Error(`Unknown step type: ${workflowStep.type}`);
      }

      // Update workflow context with step output
      execution.context = {
        ...execution.context,
        [`step_${workflowStep.order}_output`]: output,
        lastStepOutput: output,
      };

      return {
        success: true,
        aiResponse,
        output,
      };
    } catch (error) {
      this.logger.error(`Error processing step: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private buildContextualPrompt(
    basePrompt: string,
    context: Record<string, any>,
    stepExecution: WorkflowStepExecution,
    userInput?: string,
  ): string {
    let prompt = basePrompt;

    // Replace context variables in prompt
    Object.keys(context).forEach(key => {
      const placeholder = `{{${key}}}`;
      if (prompt.includes(placeholder)) {
        prompt = prompt.replace(new RegExp(placeholder, 'g'), String(context[key] || ''));
      }
    });

    // Add context information
    const contextInfo = [
      `Step: ${stepExecution.stepName} (${stepExecution.stepOrder})`,
      `Context: ${JSON.stringify(context, null, 2)}`,
    ];

    if (userInput) {
      contextInfo.push(`User Input: ${userInput}`);
    }

    return `${prompt}\n\nContext Information:\n${contextInfo.join('\n')}`;
  }

  private async generateAIResponse(prompt: string, userId: string): Promise<string> {
    // Use the AI providers service to generate response
    const messages = [{ role: 'user' as const, content: prompt }];
    
    try {
      return await this.aiProvidersService.generateResponse('gpt-3.5-turbo', messages);
    } catch (error) {
      this.logger.error(`AI response generation failed: ${error.message}`);
      return 'I apologize, but I encountered an error while processing this step. Please try again or provide your input to continue.';
    }
  }

  private async processInputStep(
    step: any,
    userInput: string,
    context: Record<string, any>,
  ): Promise<Record<string, any>> {
    const output: Record<string, any> = {
      userInput,
      timestamp: new Date().toISOString(),
    };

    // Apply validation if configured
    if (step.validation) {
      const validationResult = this.validateInput(userInput, step.validation);
      output.validation = validationResult;
      
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }
    }

    // Store input in context with configured key
    if (step.config?.contextKey) {
      output.contextKey = step.config.contextKey;
    }

    return output;
  }

  private async processDecisionStep(
    step: any,
    userInput: string,
    context: Record<string, any>,
  ): Promise<Record<string, any>> {
    const decision = userInput?.toLowerCase().trim();
    
    const output: Record<string, any> = {
      decision,
      timestamp: new Date().toISOString(),
    };

    // Evaluate decision against configured options
    if (step.config?.options) {
      const validOptions = step.config.options.map((opt: string) => opt.toLowerCase());
      if (!validOptions.includes(decision)) {
        throw new Error(`Invalid decision. Please choose from: ${step.config.options.join(', ')}`);
      }
    }

    // Determine next step based on decision
    if (step.conditions && step.conditions[decision]) {
      output.nextStepId = step.conditions[decision];
    }

    return output;
  }

  private async processActionStep(
    step: any,
    userInput: string,
    context: Record<string, any>,
  ): Promise<Record<string, any>> {
    const output: Record<string, any> = {
      action: step.config?.action || 'process',
      parameters: step.config?.parameters || {},
      userInput,
      timestamp: new Date().toISOString(),
    };

    // Execute configured action
    if (step.config?.action) {
      switch (step.config.action) {
        case 'calculate':
          output.result = this.performCalculation(step.config.parameters, context);
          break;
        case 'summarize':
          output.result = this.performSummarization(context);
          break;
        case 'validate':
          output.result = this.performValidation(step.config.parameters, context);
          break;
        default:
          output.result = 'Action completed';
      }
    }

    return output;
  }

  private async processInformationStep(
    step: any,
    context: Record<string, any>,
  ): Promise<Record<string, any>> {
    return {
      type: 'information',
      content: step.config?.content || step.description,
      timestamp: new Date().toISOString(),
    };
  }

  private async processValidationStep(
    step: any,
    userInput: string,
    context: Record<string, any>,
  ): Promise<Record<string, any>> {
    const output: Record<string, any> = {
      userInput,
      timestamp: new Date().toISOString(),
    };

    // Perform validation based on step configuration
    if (step.validation) {
      const validationResult = this.validateInput(userInput, step.validation);
      output.validation = validationResult;
      
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }
    }

    return output;
  }

  private async processCompletionStep(
    step: any,
    context: Record<string, any>,
  ): Promise<Record<string, any>> {
    return {
      type: 'completion',
      summary: this.generateWorkflowSummary(context),
      timestamp: new Date().toISOString(),
    };
  }

  private validateInput(input: string, validation: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (validation.required && (!input || input.trim().length === 0)) {
      errors.push('Input is required');
    }

    if (validation.minLength && input.length < validation.minLength) {
      errors.push(`Input must be at least ${validation.minLength} characters long`);
    }

    if (validation.maxLength && input.length > validation.maxLength) {
      errors.push(`Input must be no more than ${validation.maxLength} characters long`);
    }

    if (validation.pattern && !new RegExp(validation.pattern).test(input)) {
      errors.push('Input format is invalid');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private performCalculation(parameters: any, context: Record<string, any>): any {
    // Placeholder for calculation logic
    return { calculated: true, parameters, context };
  }

  private performSummarization(context: Record<string, any>): string {
    // Create a summary of the workflow execution so far
    const steps = Object.keys(context)
      .filter(key => key.startsWith('step_'))
      .map(key => context[key]);

    return `Workflow summary: ${steps.length} steps completed. Latest output: ${JSON.stringify(context.lastStepOutput || {})}`;
  }

  private performValidation(parameters: any, context: Record<string, any>): any {
    // Placeholder for validation logic
    return { validated: true, parameters, context };
  }

  private generateWorkflowSummary(context: Record<string, any>): string {
    const steps = Object.keys(context)
      .filter(key => key.startsWith('step_'))
      .map(key => context[key]);

    return `Workflow completed with ${steps.length} steps. Final context: ${JSON.stringify(context, null, 2)}`;
  }
}