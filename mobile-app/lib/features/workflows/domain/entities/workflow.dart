enum WorkflowCategory {
  taskManagement('task_management'),
  decisionMaking('decision_making'),
  planning('planning'),
  problemSolving('problem_solving'),
  learning('learning'),
  brainstorming('brainstorming'),
  custom('custom');

  const WorkflowCategory(this.value);
  final String value;

  static WorkflowCategory fromString(String value) {
    return WorkflowCategory.values.firstWhere(
      (category) => category.value == value,
      orElse: () => WorkflowCategory.custom,
    );
  }
}

enum WorkflowStatus {
  draft('draft'),
  published('published'),
  archived('archived');

  const WorkflowStatus(this.value);
  final String value;

  static WorkflowStatus fromString(String value) {
    return WorkflowStatus.values.firstWhere(
      (status) => status.value == value,
      orElse: () => WorkflowStatus.draft,
    );
  }
}

class Workflow {
  final String id;
  final String name;
  final String? description;
  final WorkflowCategory category;
  final WorkflowStatus status;
  final bool isTemplate;
  final String? createdBy;
  final Map<String, dynamic>? metadata;
  final String? instructions;
  final int estimatedDuration; // in minutes
  final List<WorkflowStep> steps;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Workflow({
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

  String get categoryDisplayName {
    switch (category) {
      case WorkflowCategory.taskManagement:
        return 'Task Management';
      case WorkflowCategory.decisionMaking:
        return 'Decision Making';
      case WorkflowCategory.planning:
        return 'Planning';
      case WorkflowCategory.problemSolving:
        return 'Problem Solving';
      case WorkflowCategory.learning:
        return 'Learning';
      case WorkflowCategory.brainstorming:
        return 'Brainstorming';
      case WorkflowCategory.custom:
        return 'Custom';
    }
  }

  String get formattedDuration {
    if (estimatedDuration < 60) {
      return '${estimatedDuration}m';
    } else {
      final hours = estimatedDuration ~/ 60;
      final minutes = estimatedDuration % 60;
      return minutes > 0 ? '${hours}h ${minutes}m' : '${hours}h';
    }
  }

  Workflow copyWith({
    String? id,
    String? name,
    String? description,
    WorkflowCategory? category,
    WorkflowStatus? status,
    bool? isTemplate,
    String? createdBy,
    Map<String, dynamic>? metadata,
    String? instructions,
    int? estimatedDuration,
    List<WorkflowStep>? steps,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Workflow(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      category: category ?? this.category,
      status: status ?? this.status,
      isTemplate: isTemplate ?? this.isTemplate,
      createdBy: createdBy ?? this.createdBy,
      metadata: metadata ?? this.metadata,
      instructions: instructions ?? this.instructions,
      estimatedDuration: estimatedDuration ?? this.estimatedDuration,
      steps: steps ?? this.steps,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

enum StepType {
  input('input'),
  decision('decision'),
  action('action'),
  information('information'),
  validation('validation'),
  completion('completion');

  const StepType(this.value);
  final String value;

  static StepType fromString(String value) {
    return StepType.values.firstWhere(
      (type) => type.value == value,
      orElse: () => StepType.input,
    );
  }
}

class WorkflowStep {
  final String id;
  final String workflowId;
  final String name;
  final String? description;
  final StepType type;
  final int order;
  final String? prompt;
  final Map<String, dynamic>? config;
  final Map<String, dynamic>? validation;
  final List<String>? nextStepIds;
  final Map<String, dynamic>? conditions;
  final bool isOptional;
  final int estimatedDuration;
  final DateTime createdAt;
  final DateTime updatedAt;

  const WorkflowStep({
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

  String get typeDisplayName {
    switch (type) {
      case StepType.input:
        return 'Input';
      case StepType.decision:
        return 'Decision';
      case StepType.action:
        return 'Action';
      case StepType.information:
        return 'Information';
      case StepType.validation:
        return 'Validation';
      case StepType.completion:
        return 'Completion';
    }
  }

  WorkflowStep copyWith({
    String? id,
    String? workflowId,
    String? name,
    String? description,
    StepType? type,
    int? order,
    String? prompt,
    Map<String, dynamic>? config,
    Map<String, dynamic>? validation,
    List<String>? nextStepIds,
    Map<String, dynamic>? conditions,
    bool? isOptional,
    int? estimatedDuration,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return WorkflowStep(
      id: id ?? this.id,
      workflowId: workflowId ?? this.workflowId,
      name: name ?? this.name,
      description: description ?? this.description,
      type: type ?? this.type,
      order: order ?? this.order,
      prompt: prompt ?? this.prompt,
      config: config ?? this.config,
      validation: validation ?? this.validation,
      nextStepIds: nextStepIds ?? this.nextStepIds,
      conditions: conditions ?? this.conditions,
      isOptional: isOptional ?? this.isOptional,
      estimatedDuration: estimatedDuration ?? this.estimatedDuration,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}