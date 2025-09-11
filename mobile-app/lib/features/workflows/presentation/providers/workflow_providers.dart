import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../../core/services/api_client.dart';
import '../../data/providers/workflow_api_provider.dart';
import '../../data/repositories/workflow_repository_impl.dart';
import '../../domain/entities/workflow.dart';
import '../../domain/entities/workflow_execution.dart';
import '../../domain/repositories/workflow_repository.dart';

// API client provider
final apiClientProvider = Provider<Dio>((ref) {
  return ApiClient().dio;
});

// Repository provider
final workflowRepositoryProvider = Provider<WorkflowRepository>((ref) {
  final dio = ref.read(apiClientProvider);
  final apiProvider = WorkflowApiProvider(dio, baseUrl: '${dio.options.baseUrl}/api/v1');
  return WorkflowRepositoryImpl(apiProvider);
});

// Workflow templates provider
final workflowTemplatesProvider = FutureProvider.family<List<Workflow>, String?>((ref, category) {
  final repository = ref.read(workflowRepositoryProvider);
  return repository.getWorkflowTemplates(category: category);
});

// User workflows provider
final userWorkflowsProvider = FutureProvider<List<Workflow>>((ref) {
  final repository = ref.read(workflowRepositoryProvider);
  return repository.getWorkflows(myWorkflows: true);
});

// Single workflow provider
final workflowProvider = FutureProvider.family<Workflow, String>((ref, id) {
  final repository = ref.read(workflowRepositoryProvider);
  return repository.getWorkflow(id);
});

// User workflow executions provider
final workflowExecutionsProvider = FutureProvider<List<WorkflowExecution>>((ref) {
  final repository = ref.read(workflowRepositoryProvider);
  return repository.getMyWorkflowExecutions();
});

// Single workflow execution provider
final workflowExecutionProvider = FutureProvider.family<WorkflowExecution, String>((ref, id) {
  final repository = ref.read(workflowRepositoryProvider);
  return repository.getWorkflowExecution(id);
});

// Current workflow execution notifier
class WorkflowExecutionNotifier extends StateNotifier<AsyncValue<WorkflowExecution?>> {
  final WorkflowRepository _repository;

  WorkflowExecutionNotifier(this._repository) : super(const AsyncValue.data(null));

  Future<void> startExecution(String workflowId, {Map<String, dynamic>? context}) async {
    state = const AsyncValue.loading();
    try {
      final execution = await _repository.startWorkflowExecution(workflowId, context: context);
      state = AsyncValue.data(execution);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  Future<void> executeStep(String userInput, {Map<String, dynamic>? data}) async {
    final currentExecution = state.value;
    if (currentExecution == null) return;

    state = const AsyncValue.loading();
    try {
      final updatedExecution = await _repository.executeStep(
        currentExecution.id,
        userInput,
        data: data,
      );
      state = AsyncValue.data(updatedExecution);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  Future<void> pauseExecution() async {
    final currentExecution = state.value;
    if (currentExecution == null) return;

    try {
      final updatedExecution = await _repository.pauseExecution(currentExecution.id);
      state = AsyncValue.data(updatedExecution);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  Future<void> resumeExecution() async {
    final currentExecution = state.value;
    if (currentExecution == null) return;

    try {
      final updatedExecution = await _repository.resumeExecution(currentExecution.id);
      state = AsyncValue.data(updatedExecution);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  Future<void> cancelExecution() async {
    final currentExecution = state.value;
    if (currentExecution == null) return;

    try {
      final updatedExecution = await _repository.cancelExecution(currentExecution.id);
      state = AsyncValue.data(updatedExecution);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  Future<void> loadExecution(String id) async {
    state = const AsyncValue.loading();
    try {
      final execution = await _repository.getWorkflowExecution(id);
      state = AsyncValue.data(execution);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  void clearExecution() {
    state = const AsyncValue.data(null);
  }
}

final currentWorkflowExecutionProvider = StateNotifierProvider<WorkflowExecutionNotifier, AsyncValue<WorkflowExecution?>>((ref) {
  final repository = ref.read(workflowRepositoryProvider);
  return WorkflowExecutionNotifier(repository);
});

// Selected workflow category filter
final selectedWorkflowCategoryProvider = StateProvider<WorkflowCategory?>((ref) => null);

// Workflow filter providers
final filteredWorkflowTemplatesProvider = Provider<AsyncValue<List<Workflow>>>((ref) {
  final selectedCategory = ref.watch(selectedWorkflowCategoryProvider);
  final templatesAsync = ref.watch(workflowTemplatesProvider(selectedCategory?.value));
  
  return templatesAsync;
});

// Workflow creation/editing state
class WorkflowEditorNotifier extends StateNotifier<Workflow?> {
  final WorkflowRepository _repository;

  WorkflowEditorNotifier(this._repository) : super(null);

  void startCreating({WorkflowCategory category = WorkflowCategory.custom}) {
    state = Workflow(
      id: '',
      name: '',
      category: category,
      status: WorkflowStatus.draft,
      isTemplate: false,
      estimatedDuration: 0,
      steps: [],
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }

  void startEditing(Workflow workflow) {
    state = workflow;
  }

  void updateWorkflow(Workflow workflow) {
    state = workflow;
  }

  void clear() {
    state = null;
  }

  Future<Workflow?> save() async {
    if (state == null) return null;

    try {
      final workflow = state!;
      if (workflow.id.isEmpty) {
        // Create new workflow
        final created = await _repository.createWorkflow(workflow);
        state = created;
        return created;
      } else {
        // Update existing workflow
        final updated = await _repository.updateWorkflow(workflow.id, workflow);
        state = updated;
        return updated;
      }
    } catch (error) {
      // Handle error (could emit to a separate error state)
      rethrow;
    }
  }
}

final workflowEditorProvider = StateNotifierProvider<WorkflowEditorNotifier, Workflow?>((ref) {
  final repository = ref.read(workflowRepositoryProvider);
  return WorkflowEditorNotifier(repository);
});