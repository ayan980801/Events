import 'package:json_annotation/json_annotation.dart';
import '../../domain/entities/workflow.dart';

part 'workflow_model.g.dart';

@JsonSerializable()
class WorkflowModel {
  final String id;
  final String name;
  final String? description;
  final String category;
  final String status;
  @JsonKey(name: 'isTemplate')
  final bool isTemplate;
  @JsonKey(name: 'createdBy')
  final String? createdBy;
  final Map<String, dynamic>? metadata;
  final String? instructions;
  @JsonKey(name: 'estimatedDuration')
  final int estimatedDuration;
  final List<WorkflowStepModel> steps;
  @JsonKey(name: 'createdAt')
  final String createdAt;
  @JsonKey(name: 'updatedAt')
  final String updatedAt;

  const WorkflowModel({
    required this.id,
    required this.name,
    this.description,
    required this.category,
    required this.status,
    required this.isTemplate,
    this.createdBy,
    this.metadata,
    this.instructions,
    required this.estimatedDuration,
    required this.steps,
    required this.createdAt,
    required this.updatedAt,
  });

  factory WorkflowModel.fromJson(Map<String, dynamic> json) => _$WorkflowModelFromJson(json);
  
  Map<String, dynamic> toJson() => _$WorkflowModelToJson(this);

  Workflow toEntity() {
    return Workflow(
      id: id,
      name: name,
      description: description,
      category: WorkflowCategory.fromString(category),
      status: WorkflowStatus.fromString(status),
      isTemplate: isTemplate,
      createdBy: createdBy,
      metadata: metadata,
      instructions: instructions,
      estimatedDuration: estimatedDuration,
      steps: steps.map((step) => step.toEntity()).toList(),
      createdAt: DateTime.parse(createdAt),
      updatedAt: DateTime.parse(updatedAt),
    );
  }

  factory WorkflowModel.fromEntity(Workflow workflow) {
    return WorkflowModel(
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      category: workflow.category.value,
      status: workflow.status.value,
      isTemplate: workflow.isTemplate,
      createdBy: workflow.createdBy,
      metadata: workflow.metadata,
      instructions: workflow.instructions,
      estimatedDuration: workflow.estimatedDuration,
      steps: workflow.steps.map((step) => WorkflowStepModel.fromEntity(step)).toList(),
      createdAt: workflow.createdAt.toIso8601String(),
      updatedAt: workflow.updatedAt.toIso8601String(),
    );
  }
}

@JsonSerializable()
class WorkflowStepModel {
  final String id;
  @JsonKey(name: 'workflowId')
  final String workflowId;
  final String name;
  final String? description;
  final String type;
  final int order;
  final String? prompt;
  final Map<String, dynamic>? config;
  final Map<String, dynamic>? validation;
  @JsonKey(name: 'nextStepIds')
  final List<String>? nextStepIds;
  final Map<String, dynamic>? conditions;
  @JsonKey(name: 'isOptional')
  final bool isOptional;
  @JsonKey(name: 'estimatedDuration')
  final int estimatedDuration;
  @JsonKey(name: 'createdAt')
  final String createdAt;
  @JsonKey(name: 'updatedAt')
  final String updatedAt;

  const WorkflowStepModel({
    required this.id,
    required this.workflowId,
    required this.name,
    this.description,
    required this.type,
    required this.order,
    this.prompt,
    this.config,
    this.validation,
    this.nextStepIds,
    this.conditions,
    required this.isOptional,
    required this.estimatedDuration,
    required this.createdAt,
    required this.updatedAt,
  });

  factory WorkflowStepModel.fromJson(Map<String, dynamic> json) => _$WorkflowStepModelFromJson(json);
  
  Map<String, dynamic> toJson() => _$WorkflowStepModelToJson(this);

  WorkflowStep toEntity() {
    return WorkflowStep(
      id: id,
      workflowId: workflowId,
      name: name,
      description: description,
      type: StepType.fromString(type),
      order: order,
      prompt: prompt,
      config: config,
      validation: validation,
      nextStepIds: nextStepIds,
      conditions: conditions,
      isOptional: isOptional,
      estimatedDuration: estimatedDuration,
      createdAt: DateTime.parse(createdAt),
      updatedAt: DateTime.parse(updatedAt),
    );
  }

  factory WorkflowStepModel.fromEntity(WorkflowStep step) {
    return WorkflowStepModel(
      id: step.id,
      workflowId: step.workflowId,
      name: step.name,
      description: step.description,
      type: step.type.value,
      order: step.order,
      prompt: step.prompt,
      config: step.config,
      validation: step.validation,
      nextStepIds: step.nextStepIds,
      conditions: step.conditions,
      isOptional: step.isOptional,
      estimatedDuration: step.estimatedDuration,
      createdAt: step.createdAt.toIso8601String(),
      updatedAt: step.updatedAt.toIso8601String(),
    );
  }
}