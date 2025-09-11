import '../../domain/entities/workflow.dart';
import '../../domain/entities/workflow_execution.dart';
import '../../domain/repositories/workflow_repository.dart';
import '../providers/workflow_api_provider.dart';
import '../models/workflow_model.dart';

class WorkflowRepositoryImpl implements WorkflowRepository {
  final WorkflowApiProvider _apiProvider;

  WorkflowRepositoryImpl(this._apiProvider);

  @override
  Future<List<Workflow>> getWorkflows({
    String? category,
    bool? isTemplate,
    bool? myWorkflows,
  }) async {
    try {
      final models = await _apiProvider.getWorkflows(
        category: category,
        isTemplate: isTemplate,
        myWorkflows: myWorkflows,
      );
      return models.map((model) => model.toEntity()).toList();
    } catch (e) {
      throw Exception('Failed to get workflows: $e');
    }
  }

  @override
  Future<List<Workflow>> getWorkflowTemplates({String? category}) async {
    try {
      final models = await _apiProvider.getWorkflowTemplates(category: category);
      return models.map((model) => model.toEntity()).toList();
    } catch (e) {
      throw Exception('Failed to get workflow templates: $e');
    }
  }

  @override
  Future<Workflow> getWorkflow(String id) async {
    try {
      final model = await _apiProvider.getWorkflow(id);
      return model.toEntity();
    } catch (e) {
      throw Exception('Failed to get workflow: $e');
    }
  }

  @override
  Future<Workflow> createWorkflow(Workflow workflow) async {
    try {
      final model = WorkflowModel.fromEntity(workflow);
      final createdModel = await _apiProvider.createWorkflow(model.toJson());
      return createdModel.toEntity();
    } catch (e) {
      throw Exception('Failed to create workflow: $e');
    }
  }

  @override
  Future<Workflow> updateWorkflow(String id, Workflow workflow) async {
    try {
      final model = WorkflowModel.fromEntity(workflow);
      final updatedModel = await _apiProvider.updateWorkflow(id, model.toJson());
      return updatedModel.toEntity();
    } catch (e) {
      throw Exception('Failed to update workflow: $e');
    }
  }

  @override
  Future<void> deleteWorkflow(String id) async {
    try {
      await _apiProvider.deleteWorkflow(id);
    } catch (e) {
      throw Exception('Failed to delete workflow: $e');
    }
  }

  @override
  Future<Workflow> publishWorkflow(String id) async {
    try {
      final model = await _apiProvider.publishWorkflow(id);
      return model.toEntity();
    } catch (e) {
      throw Exception('Failed to publish workflow: $e');
    }
  }

  @override
  Future<WorkflowExecution> startWorkflowExecution(
    String workflowId, {
    Map<String, dynamic>? context,
  }) async {
    try {
      final request = {
        'workflowId': workflowId,
        if (context != null) 'context': context,
      };
      final model = await _apiProvider.startWorkflowExecution(request);
      return model.toEntity();
    } catch (e) {
      throw Exception('Failed to start workflow execution: $e');
    }
  }

  @override
  Future<List<WorkflowExecution>> getMyWorkflowExecutions() async {
    try {
      final models = await _apiProvider.getMyWorkflowExecutions();
      return models.map((model) => model.toEntity()).toList();
    } catch (e) {
      throw Exception('Failed to get workflow executions: $e');
    }
  }

  @override
  Future<WorkflowExecution> getWorkflowExecution(String id) async {
    try {
      final model = await _apiProvider.getWorkflowExecution(id);
      return model.toEntity();
    } catch (e) {
      throw Exception('Failed to get workflow execution: $e');
    }
  }

  @override
  Future<WorkflowExecution> executeStep(
    String executionId,
    String userInput, {
    Map<String, dynamic>? data,
  }) async {
    try {
      final request = {
        'userInput': userInput,
        if (data != null) 'data': data,
      };
      final model = await _apiProvider.executeStep(executionId, request);
      return model.toEntity();
    } catch (e) {
      throw Exception('Failed to execute step: $e');
    }
  }

  @override
  Future<WorkflowExecution> pauseExecution(String id) async {
    try {
      final model = await _apiProvider.performExecutionAction(id, {'action': 'pause'});
      return model.toEntity();
    } catch (e) {
      throw Exception('Failed to pause execution: $e');
    }
  }

  @override
  Future<WorkflowExecution> resumeExecution(String id) async {
    try {
      final model = await _apiProvider.performExecutionAction(id, {'action': 'resume'});
      return model.toEntity();
    } catch (e) {
      throw Exception('Failed to resume execution: $e');
    }
  }

  @override
  Future<WorkflowExecution> cancelExecution(String id) async {
    try {
      final model = await _apiProvider.performExecutionAction(id, {'action': 'cancel'});
      return model.toEntity();
    } catch (e) {
      throw Exception('Failed to cancel execution: $e');
    }
  }
}