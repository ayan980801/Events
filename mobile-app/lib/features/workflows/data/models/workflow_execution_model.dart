import 'package:json_annotation/json_annotation.dart';
import '../../domain/entities/workflow_execution.dart';

part 'workflow_execution_model.g.dart';

@JsonSerializable()
class WorkflowExecutionModel {
  final String id;
  @JsonKey(name: 'workflowId')
  final String workflowId;
  @JsonKey(name: 'userId')
  final String userId;
  final String status;
  @JsonKey(name: 'currentStepId')
  final String? currentStepId;
  final Map<String, dynamic>? context;
  final Map<String, dynamic>? result;
  @JsonKey(name: 'errorMessage')
  final String? errorMessage;
  @JsonKey(name: 'startedAt')
  final String? startedAt;
  @JsonKey(name: 'completedAt')
  final String? completedAt;
  @JsonKey(name: 'pausedAt')
  final String? pausedAt;
  @JsonKey(name: 'stepExecutions')
  final List<WorkflowStepExecutionModel> stepExecutions;
  @JsonKey(name: 'createdAt')
  final String createdAt;
  @JsonKey(name: 'updatedAt')
  final String updatedAt;

  const WorkflowExecutionModel({
    required this.id,
    required this.workflowId,
    required this.userId,
    required this.status,
    this.currentStepId,
    this.context,
    this.result,
    this.errorMessage,
    this.startedAt,
    this.completedAt,
    this.pausedAt,
    required this.stepExecutions,
    required this.createdAt,
    required this.updatedAt,
  });

  factory WorkflowExecutionModel.fromJson(Map<String, dynamic> json) => _$WorkflowExecutionModelFromJson(json);
  
  Map<String, dynamic> toJson() => _$WorkflowExecutionModelToJson(this);

  WorkflowExecution toEntity() {
    return WorkflowExecution(
      id: id,
      workflowId: workflowId,
      userId: userId,
      status: WorkflowExecutionStatus.fromString(status),
      currentStepId: currentStepId,
      context: context,
      result: result,
      errorMessage: errorMessage,
      startedAt: startedAt != null ? DateTime.parse(startedAt!) : null,
      completedAt: completedAt != null ? DateTime.parse(completedAt!) : null,
      pausedAt: pausedAt != null ? DateTime.parse(pausedAt!) : null,
      stepExecutions: stepExecutions.map((step) => step.toEntity()).toList(),
      createdAt: DateTime.parse(createdAt),
      updatedAt: DateTime.parse(updatedAt),
    );
  }

  factory WorkflowExecutionModel.fromEntity(WorkflowExecution execution) {
    return WorkflowExecutionModel(
      id: execution.id,
      workflowId: execution.workflowId,
      userId: execution.userId,
      status: execution.status.value,
      currentStepId: execution.currentStepId,
      context: execution.context,
      result: execution.result,
      errorMessage: execution.errorMessage,
      startedAt: execution.startedAt?.toIso8601String(),
      completedAt: execution.completedAt?.toIso8601String(),
      pausedAt: execution.pausedAt?.toIso8601String(),
      stepExecutions: execution.stepExecutions.map((step) => WorkflowStepExecutionModel.fromEntity(step)).toList(),
      createdAt: execution.createdAt.toIso8601String(),
      updatedAt: execution.updatedAt.toIso8601String(),
    );
  }
}

@JsonSerializable()
class WorkflowStepExecutionModel {
  final String id;
  @JsonKey(name: 'workflowExecutionId')
  final String workflowExecutionId;
  @JsonKey(name: 'stepId')
  final String stepId;
  @JsonKey(name: 'stepName')
  final String stepName;
  @JsonKey(name: 'stepOrder')
  final int stepOrder;
  final String status;
  final Map<String, dynamic>? input;
  final Map<String, dynamic>? output;
  @JsonKey(name: 'aiResponse')
  final String? aiResponse;
  @JsonKey(name: 'userInput')
  final String? userInput;
  @JsonKey(name: 'errorMessage')
  final String? errorMessage;
  @JsonKey(name: 'startedAt')
  final String? startedAt;
  @JsonKey(name: 'completedAt')
  final String? completedAt;
  @JsonKey(name: 'retryCount')
  final int retryCount;
  @JsonKey(name: 'createdAt')
  final String createdAt;
  @JsonKey(name: 'updatedAt')
  final String updatedAt;

  const WorkflowStepExecutionModel({
    required this.id,
    required this.workflowExecutionId,
    required this.stepId,
    required this.stepName,
    required this.stepOrder,
    required this.status,
    this.input,
    this.output,
    this.aiResponse,
    this.userInput,
    this.errorMessage,
    this.startedAt,
    this.completedAt,
    required this.retryCount,
    required this.createdAt,
    required this.updatedAt,
  });

  factory WorkflowStepExecutionModel.fromJson(Map<String, dynamic> json) => _$WorkflowStepExecutionModelFromJson(json);
  
  Map<String, dynamic> toJson() => _$WorkflowStepExecutionModelToJson(this);

  WorkflowStepExecution toEntity() {
    return WorkflowStepExecution(
      id: id,
      workflowExecutionId: workflowExecutionId,
      stepId: stepId,
      stepName: stepName,
      stepOrder: stepOrder,
      status: StepStatus.fromString(status),
      input: input,
      output: output,
      aiResponse: aiResponse,
      userInput: userInput,
      errorMessage: errorMessage,
      startedAt: startedAt != null ? DateTime.parse(startedAt!) : null,
      completedAt: completedAt != null ? DateTime.parse(completedAt!) : null,
      retryCount: retryCount,
      createdAt: DateTime.parse(createdAt),
      updatedAt: DateTime.parse(updatedAt),
    );
  }

  factory WorkflowStepExecutionModel.fromEntity(WorkflowStepExecution execution) {
    return WorkflowStepExecutionModel(
      id: execution.id,
      workflowExecutionId: execution.workflowExecutionId,
      stepId: execution.stepId,
      stepName: execution.stepName,
      stepOrder: execution.stepOrder,
      status: execution.status.value,
      input: execution.input,
      output: execution.output,
      aiResponse: execution.aiResponse,
      userInput: execution.userInput,
      errorMessage: execution.errorMessage,
      startedAt: execution.startedAt?.toIso8601String(),
      completedAt: execution.completedAt?.toIso8601String(),
      retryCount: execution.retryCount,
      createdAt: execution.createdAt.toIso8601String(),
      updatedAt: execution.updatedAt.toIso8601String(),
    );
  }
}