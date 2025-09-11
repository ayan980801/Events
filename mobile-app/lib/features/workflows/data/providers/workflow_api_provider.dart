import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../models/workflow_model.dart';
import '../models/workflow_execution_model.dart';

part 'workflow_api_provider.g.dart';

@RestApi()
abstract class WorkflowApiProvider {
  factory WorkflowApiProvider(Dio dio, {String baseUrl}) = _WorkflowApiProvider;

  // Workflow endpoints
  @GET('/workflows')
  Future<List<WorkflowModel>> getWorkflows({
    @Query('category') String? category,
    @Query('isTemplate') bool? isTemplate,
    @Query('myWorkflows') bool? myWorkflows,
  });

  @GET('/workflows/templates')
  Future<List<WorkflowModel>> getWorkflowTemplates({
    @Query('category') String? category,
  });

  @GET('/workflows/{id}')
  Future<WorkflowModel> getWorkflow(@Path('id') String id);

  @POST('/workflows')
  Future<WorkflowModel> createWorkflow(@Body() Map<String, dynamic> workflow);

  @PATCH('/workflows/{id}')
  Future<WorkflowModel> updateWorkflow(
    @Path('id') String id,
    @Body() Map<String, dynamic> workflow,
  );

  @DELETE('/workflows/{id}')
  Future<void> deleteWorkflow(@Path('id') String id);

  @POST('/workflows/{id}/publish')
  Future<WorkflowModel> publishWorkflow(@Path('id') String id);

  // Workflow execution endpoints
  @POST('/workflows/executions')
  Future<WorkflowExecutionModel> startWorkflowExecution(
    @Body() Map<String, dynamic> request,
  );

  @GET('/workflows/executions/my')
  Future<List<WorkflowExecutionModel>> getMyWorkflowExecutions();

  @GET('/workflows/executions/{id}')
  Future<WorkflowExecutionModel> getWorkflowExecution(@Path('id') String id);

  @POST('/workflows/executions/{id}/steps')
  Future<WorkflowExecutionModel> executeStep(
    @Path('id') String executionId,
    @Body() Map<String, dynamic> stepInput,
  );

  @POST('/workflows/executions/{id}/actions')
  Future<WorkflowExecutionModel> performExecutionAction(
    @Path('id') String id,
    @Body() Map<String, dynamic> action,
  );
}