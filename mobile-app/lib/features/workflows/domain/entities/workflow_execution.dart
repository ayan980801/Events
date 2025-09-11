enum WorkflowExecutionStatus {
  created('created'),
  inProgress('in_progress'),
  paused('paused'),
  completed('completed'),
  failed('failed'),
  cancelled('cancelled');

  const WorkflowExecutionStatus(this.value);
  final String value;

  static WorkflowExecutionStatus fromString(String value) {
    return WorkflowExecutionStatus.values.firstWhere(
      (status) => status.value == value,
      orElse: () => WorkflowExecutionStatus.created,
    );
  }
}

enum StepStatus {
  pending('pending'),
  inProgress('in_progress'),
  completed('completed'),
  skipped('skipped');

  const StepStatus(this.value);
  final String value;

  static StepStatus fromString(String value) {
    return StepStatus.values.firstWhere(
      (status) => status.value == value,
      orElse: () => StepStatus.pending,
    );
  }
}

class WorkflowExecution {
  final String id;
  final String workflowId;
  final String userId;
  final WorkflowExecutionStatus status;
  final String? currentStepId;
  final Map<String, dynamic>? context;
  final Map<String, dynamic>? result;
  final String? errorMessage;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final DateTime? pausedAt;
  final List<WorkflowStepExecution> stepExecutions;
  final DateTime createdAt;
  final DateTime updatedAt;

  const WorkflowExecution({
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

  String get statusDisplayName {
    switch (status) {
      case WorkflowExecutionStatus.created:
        return 'Created';
      case WorkflowExecutionStatus.inProgress:
        return 'In Progress';
      case WorkflowExecutionStatus.paused:
        return 'Paused';
      case WorkflowExecutionStatus.completed:
        return 'Completed';
      case WorkflowExecutionStatus.failed:
        return 'Failed';
      case WorkflowExecutionStatus.cancelled:
        return 'Cancelled';
    }
  }

  double get progressPercentage {
    if (stepExecutions.isEmpty) return 0.0;
    
    final completedSteps = stepExecutions
        .where((step) => step.status == StepStatus.completed || step.status == StepStatus.skipped)
        .length;
    
    return completedSteps / stepExecutions.length;
  }

  int get completedStepsCount {
    return stepExecutions
        .where((step) => step.status == StepStatus.completed || step.status == StepStatus.skipped)
        .length;
  }

  int get totalStepsCount => stepExecutions.length;

  WorkflowStepExecution? get currentStepExecution {
    if (currentStepId == null) return null;
    
    try {
      return stepExecutions.firstWhere(
        (step) => step.stepId == currentStepId,
      );
    } catch (e) {
      return null;
    }
  }

  Duration? get elapsedTime {
    if (startedAt == null) return null;
    
    final endTime = completedAt ?? DateTime.now();
    return endTime.difference(startedAt!);
  }

  WorkflowExecution copyWith({
    String? id,
    String? workflowId,
    String? userId,
    WorkflowExecutionStatus? status,
    String? currentStepId,
    Map<String, dynamic>? context,
    Map<String, dynamic>? result,
    String? errorMessage,
    DateTime? startedAt,
    DateTime? completedAt,
    DateTime? pausedAt,
    List<WorkflowStepExecution>? stepExecutions,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return WorkflowExecution(
      id: id ?? this.id,
      workflowId: workflowId ?? this.workflowId,
      userId: userId ?? this.userId,
      status: status ?? this.status,
      currentStepId: currentStepId ?? this.currentStepId,
      context: context ?? this.context,
      result: result ?? this.result,
      errorMessage: errorMessage ?? this.errorMessage,
      startedAt: startedAt ?? this.startedAt,
      completedAt: completedAt ?? this.completedAt,
      pausedAt: pausedAt ?? this.pausedAt,
      stepExecutions: stepExecutions ?? this.stepExecutions,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class WorkflowStepExecution {
  final String id;
  final String workflowExecutionId;
  final String stepId;
  final String stepName;
  final int stepOrder;
  final StepStatus status;
  final Map<String, dynamic>? input;
  final Map<String, dynamic>? output;
  final String? aiResponse;
  final String? userInput;
  final String? errorMessage;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final int retryCount;
  final DateTime createdAt;
  final DateTime updatedAt;

  const WorkflowStepExecution({
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

  String get statusDisplayName {
    switch (status) {
      case StepStatus.pending:
        return 'Pending';
      case StepStatus.inProgress:
        return 'In Progress';
      case StepStatus.completed:
        return 'Completed';
      case StepStatus.skipped:
        return 'Skipped';
    }
  }

  Duration? get executionTime {
    if (startedAt == null) return null;
    
    final endTime = completedAt ?? DateTime.now();
    return endTime.difference(startedAt!);
  }

  WorkflowStepExecution copyWith({
    String? id,
    String? workflowExecutionId,
    String? stepId,
    String? stepName,
    int? stepOrder,
    StepStatus? status,
    Map<String, dynamic>? input,
    Map<String, dynamic>? output,
    String? aiResponse,
    String? userInput,
    String? errorMessage,
    DateTime? startedAt,
    DateTime? completedAt,
    int? retryCount,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return WorkflowStepExecution(
      id: id ?? this.id,
      workflowExecutionId: workflowExecutionId ?? this.workflowExecutionId,
      stepId: stepId ?? this.stepId,
      stepName: stepName ?? this.stepName,
      stepOrder: stepOrder ?? this.stepOrder,
      status: status ?? this.status,
      input: input ?? this.input,
      output: output ?? this.output,
      aiResponse: aiResponse ?? this.aiResponse,
      userInput: userInput ?? this.userInput,
      errorMessage: errorMessage ?? this.errorMessage,
      startedAt: startedAt ?? this.startedAt,
      completedAt: completedAt ?? this.completedAt,
      retryCount: retryCount ?? this.retryCount,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}