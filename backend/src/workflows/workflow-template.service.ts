import { Injectable, Logger } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowCategory } from './entities/workflow.entity';
import { StepType } from './entities/workflow-step.entity';

@Injectable()
export class WorkflowTemplateService {
  private readonly logger = new Logger(WorkflowTemplateService.name);

  constructor(private workflowsService: WorkflowsService) {}

  async createDefaultTemplates(): Promise<void> {
    try {
      // Check if templates already exist
      const existingTemplates = await this.workflowsService.findAll(undefined, undefined, true);
      
      if (existingTemplates.length > 0) {
        this.logger.log('Workflow templates already exist, skipping creation');
        return;
      }

      await this.createTaskPlanningTemplate();
      await this.createDecisionMakingTemplate();
      await this.createProblemSolvingTemplate();
      await this.createLearningTemplate();

      this.logger.log('Default workflow templates created successfully');
    } catch (error) {
      this.logger.error('Failed to create default templates:', error);
    }
  }

  private async createTaskPlanningTemplate(): Promise<void> {
    const template = {
      name: 'Project Task Planning',
      description: 'A structured approach to planning and organizing project tasks',
      category: WorkflowCategory.TASK_MANAGEMENT,
      isTemplate: true,
      instructions: 'This workflow will guide you through creating a comprehensive project plan with clear tasks, priorities, and timelines.',
      estimatedDuration: 30,
      steps: [
        {
          name: 'Project Overview',
          description: 'Define the project scope and objectives',
          type: StepType.INPUT,
          order: 1,
          prompt: 'Help the user define their project by asking about the project name, main objectives, target completion date, and key stakeholders. Provide guidance on how to create clear, measurable project goals.',
          config: { contextKey: 'project_overview' },
          estimatedDuration: 5,
        },
        {
          name: 'Task Identification',
          description: 'Identify all major tasks and activities',
          type: StepType.INPUT,
          order: 2,
          prompt: 'Based on the project overview provided ({{project_overview}}), help the user identify all major tasks and activities needed to complete the project. Ask them to list out everything they can think of, and suggest additional tasks they might have missed.',
          config: { contextKey: 'tasks' },
          estimatedDuration: 10,
        },
        {
          name: 'Task Prioritization',
          description: 'Prioritize tasks by importance and urgency',
          type: StepType.DECISION,
          order: 3,
          prompt: 'Help the user prioritize their tasks using the Eisenhower Matrix (Important/Urgent). For each task identified ({{tasks}}), guide them to categorize as: 1) Urgent & Important, 2) Important but not Urgent, 3) Urgent but not Important, 4) Neither Urgent nor Important.',
          config: { 
            options: ['high', 'medium', 'low'],
            contextKey: 'prioritized_tasks' 
          },
          estimatedDuration: 8,
        },
        {
          name: 'Timeline Creation',
          description: 'Create a realistic timeline for task completion',
          type: StepType.INPUT,
          order: 4,
          prompt: 'Based on the prioritized tasks ({{prioritized_tasks}}), help the user create a realistic timeline. Ask about task dependencies, estimated time for each task, available working hours per day/week, and any constraints or deadlines.',
          config: { contextKey: 'timeline' },
          estimatedDuration: 7,
        },
        {
          name: 'Plan Summary',
          description: 'Review and finalize the project plan',
          type: StepType.COMPLETION,
          order: 5,
          prompt: 'Create a comprehensive project plan summary that includes: project overview ({{project_overview}}), prioritized task list ({{prioritized_tasks}}), and timeline ({{timeline}}). Provide actionable next steps and suggest tools for project management.',
          estimatedDuration: 0,
        },
      ],
    };

    await this.workflowsService.create(template, 'system');
  }

  private async createDecisionMakingTemplate(): Promise<void> {
    const template = {
      name: 'Strategic Decision Making',
      description: 'A systematic approach to making important decisions',
      category: WorkflowCategory.DECISION_MAKING,
      isTemplate: true,
      instructions: 'This workflow helps you make better decisions by systematically analyzing options, considering consequences, and evaluating outcomes.',
      estimatedDuration: 25,
      steps: [
        {
          name: 'Define the Decision',
          description: 'Clearly define what decision needs to be made',
          type: StepType.INPUT,
          order: 1,
          prompt: 'Help the user clearly define their decision. Ask them to describe the situation, what decision they need to make, why this decision is important, and what happens if no decision is made.',
          config: { contextKey: 'decision_context' },
          estimatedDuration: 5,
        },
        {
          name: 'Identify Options',
          description: 'Brainstorm all possible options and alternatives',
          type: StepType.INPUT,
          order: 2,
          prompt: 'Based on the decision context ({{decision_context}}), help the user brainstorm all possible options. Encourage creative thinking and suggest they consider both obvious and unconventional alternatives.',
          config: { contextKey: 'options' },
          estimatedDuration: 8,
        },
        {
          name: 'Evaluate Pros and Cons',
          description: 'Analyze the advantages and disadvantages of each option',
          type: StepType.ACTION,
          order: 3,
          prompt: 'For each option identified ({{options}}), help the user create a comprehensive pros and cons analysis. Consider short-term and long-term consequences, risks, benefits, resource requirements, and impact on stakeholders.',
          config: { 
            action: 'analyze',
            contextKey: 'analysis' 
          },
          estimatedDuration: 10,
        },
        {
          name: 'Make the Decision',
          description: 'Choose the best option based on analysis',
          type: StepType.DECISION,
          order: 4,
          prompt: 'Based on the analysis ({{analysis}}), guide the user to make their decision. Help them weigh the evidence, consider their values and priorities, and choose the option that best aligns with their goals.',
          config: { 
            options: ['option_1', 'option_2', 'option_3', 'need_more_analysis'],
            contextKey: 'final_decision' 
          },
          estimatedDuration: 2,
        },
        {
          name: 'Implementation Plan',
          description: 'Create an action plan for implementing the decision',
          type: StepType.COMPLETION,
          order: 5,
          prompt: 'Create an implementation plan for the chosen decision ({{final_decision}}). Include specific action steps, timeline, resources needed, potential obstacles, and success metrics. Provide encouragement and next steps.',
          estimatedDuration: 0,
        },
      ],
    };

    await this.workflowsService.create(template, 'system');
  }

  private async createProblemSolvingTemplate(): Promise<void> {
    const template = {
      name: 'Systematic Problem Solving',
      description: 'A structured approach to identifying and solving complex problems',
      category: WorkflowCategory.PROBLEM_SOLVING,
      isTemplate: true,
      instructions: 'This workflow guides you through a systematic problem-solving process to find effective solutions.',
      estimatedDuration: 35,
      steps: [
        {
          name: 'Problem Identification',
          description: 'Clearly define and understand the problem',
          type: StepType.INPUT,
          order: 1,
          prompt: 'Help the user clearly identify and define their problem. Ask them to describe the current situation, what specific issue they are facing, who is affected, when the problem occurs, and what the ideal outcome would look like.',
          config: { contextKey: 'problem_definition' },
          estimatedDuration: 8,
        },
        {
          name: 'Root Cause Analysis',
          description: 'Identify the underlying causes of the problem',
          type: StepType.ACTION,
          order: 2,
          prompt: 'Based on the problem definition ({{problem_definition}}), help the user conduct a root cause analysis using the "5 Whys" technique. Keep asking "why" to dig deeper into the underlying causes rather than just addressing symptoms.',
          config: { 
            action: 'analyze',
            contextKey: 'root_causes' 
          },
          estimatedDuration: 10,
        },
        {
          name: 'Solution Brainstorming',
          description: 'Generate multiple potential solutions',
          type: StepType.INPUT,
          order: 3,
          prompt: 'Now that we understand the root causes ({{root_causes}}), help the user brainstorm potential solutions. Encourage creative thinking, quantity over quality initially, and solutions that address the root causes rather than just symptoms.',
          config: { contextKey: 'potential_solutions' },
          estimatedDuration: 10,
        },
        {
          name: 'Solution Evaluation',
          description: 'Evaluate and rank potential solutions',
          type: StepType.ACTION,
          order: 4,
          prompt: 'Help the user evaluate each potential solution ({{potential_solutions}}) using criteria such as: feasibility, cost, time required, effectiveness, risks, and sustainability. Rank solutions from most to least promising.',
          config: { 
            action: 'evaluate',
            contextKey: 'solution_ranking' 
          },
          estimatedDuration: 7,
        },
        {
          name: 'Implementation Strategy',
          description: 'Create a plan to implement the best solution',
          type: StepType.COMPLETION,
          order: 5,
          prompt: 'Based on the solution evaluation ({{solution_ranking}}), help the user create a detailed implementation strategy for the top-ranked solution. Include step-by-step actions, timeline, resources needed, success metrics, and contingency plans.',
          estimatedDuration: 0,
        },
      ],
    };

    await this.workflowsService.create(template, 'system');
  }

  private async createLearningTemplate(): Promise<void> {
    const template = {
      name: 'Effective Learning Plan',
      description: 'A structured approach to learning new skills or subjects',
      category: WorkflowCategory.LEARNING,
      isTemplate: true,
      instructions: 'This workflow helps you create an effective learning plan tailored to your goals, learning style, and available time.',
      estimatedDuration: 40,
      steps: [
        {
          name: 'Learning Goals',
          description: 'Define what you want to learn and why',
          type: StepType.INPUT,
          order: 1,
          prompt: 'Help the user define their learning goals. Ask about what they want to learn, why it is important to them, their current skill level, desired proficiency level, and timeline for achieving their goals.',
          config: { contextKey: 'learning_goals' },
          estimatedDuration: 8,
        },
        {
          name: 'Learning Style Assessment',
          description: 'Identify preferred learning methods and styles',
          type: StepType.DECISION,
          order: 2,
          prompt: 'Help the user identify their learning style preferences. Ask about how they learn best: visual (diagrams, videos), auditory (listening, discussion), kinesthetic (hands-on practice), or reading/writing. Also ask about their preferred learning environment and schedule.',
          config: { 
            options: ['visual', 'auditory', 'kinesthetic', 'reading_writing', 'mixed'],
            contextKey: 'learning_style' 
          },
          estimatedDuration: 5,
        },
        {
          name: 'Resource Identification',
          description: 'Find and organize learning resources',
          type: StepType.INPUT,
          order: 3,
          prompt: 'Based on the learning goals ({{learning_goals}}) and learning style ({{learning_style}}), help the user identify appropriate learning resources. Suggest books, online courses, videos, practice exercises, mentors, or communities that align with their preferences.',
          config: { contextKey: 'resources' },
          estimatedDuration: 12,
        },
        {
          name: 'Study Schedule',
          description: 'Create a realistic study schedule',
          type: StepType.INPUT,
          order: 4,
          prompt: 'Help the user create a realistic study schedule based on their available time, learning goals ({{learning_goals}}), and selected resources ({{resources}}). Consider their other commitments, energy levels throughout the day, and the importance of regular practice.',
          config: { contextKey: 'schedule' },
          estimatedDuration: 10,
        },
        {
          name: 'Progress Tracking',
          description: 'Set up methods to track learning progress',
          type: StepType.ACTION,
          order: 5,
          prompt: 'Help the user set up a system to track their learning progress. Suggest methods for measuring progress, milestone checkpoints, reflection practices, and ways to stay motivated throughout their learning journey.',
          config: { 
            action: 'plan',
            contextKey: 'tracking_system' 
          },
          estimatedDuration: 5,
        },
        {
          name: 'Learning Plan Summary',
          description: 'Compile the complete learning plan',
          type: StepType.COMPLETION,
          order: 6,
          prompt: 'Create a comprehensive learning plan summary that includes: learning goals ({{learning_goals}}), learning style preferences ({{learning_style}}), curated resources ({{resources}}), study schedule ({{schedule}}), and progress tracking system ({{tracking_system}}). Provide encouragement and tips for successful learning.',
          estimatedDuration: 0,
        },
      ],
    };

    await this.workflowsService.create(template, 'system');
  }
}