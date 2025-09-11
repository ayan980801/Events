import '../entities/workflow.dart';
import '../entities/workflow_execution.dart';

abstract class WorkflowRepository {
  // Workflow methods
  Future<List<Workflow>> getWorkflows({
    String? category,
    bool? isTemplate,
    bool? myWorkflows,
  });
  
  Future<List<Workflow>> getWorkflowTemplates({String? category});
  
  Future<Workflow> getWorkflow(String id);
  
  Future<Workflow> createWorkflow(Workflow workflow);
  
  Future<Workflow> updateWorkflow(String id, Workflow workflow);
  
  Future<void> deleteWorkflow(String id);
  
  Future<Workflow> publishWorkflow(String id);

  // Workflow execution methods
  Future<WorkflowExecution> startWorkflowExecution(String workflowId, {Map<String, dynamic>? context});
  
  Future<List<WorkflowExecution>> getMyWorkflowExecutions();
  
  Future<WorkflowExecution> getWorkflowExecution(String id);
  
  Future<WorkflowExecution> executeStep(String executionId, String userInput, {Map<String, dynamic>? data});
  
  Future<WorkflowExecution> pauseExecution(String id);
  
  Future<WorkflowExecution> resumeExecution(String id);
  
  Future<WorkflowExecution> cancelExecution(String id);
}