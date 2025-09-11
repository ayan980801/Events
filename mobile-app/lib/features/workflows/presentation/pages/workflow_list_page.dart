import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../domain/entities/workflow.dart';
import '../providers/workflow_providers.dart';
import '../widgets/workflow_card.dart';
import '../widgets/workflow_category_filter.dart';

class WorkflowListPage extends ConsumerWidget {
  const WorkflowListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final templatesAsync = ref.watch(filteredWorkflowTemplatesProvider);
    final userWorkflowsAsync = ref.watch(userWorkflowsProvider);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Workflows'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Templates', icon: Icon(Icons.library_books)),
              Tab(text: 'My Workflows', icon: Icon(Icons.folder)),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // Templates tab
            _buildTemplatesTab(context, ref, templatesAsync),
            // My workflows tab
            _buildMyWorkflowsTab(context, ref, userWorkflowsAsync),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => _createNewWorkflow(context),
          icon: const Icon(Icons.add),
          label: const Text('Create Workflow'),
        ),
      ),
    );
  }

  Widget _buildTemplatesTab(BuildContext context, WidgetRef ref, AsyncValue<List<Workflow>> templatesAsync) {
    return Column(
      children: [
        // Category filter
        const Padding(
          padding: EdgeInsets.all(16.0),
          child: WorkflowCategoryFilter(),
        ),
        // Templates list
        Expanded(
          child: templatesAsync.when(
            data: (templates) {
              if (templates.isEmpty) {
                return _buildEmptyState(
                  context,
                  'No templates found',
                  'Try changing the category filter or check back later.',
                  Icons.library_books_outlined,
                );
              }

              return RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(workflowTemplatesProvider);
                },
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  itemCount: templates.length,
                  itemBuilder: (context, index) {
                    final workflow = templates[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: WorkflowCard(
                        workflow: workflow,
                        onTap: () => _startWorkflow(context, ref, workflow),
                        onView: () => _viewWorkflow(context, workflow),
                        isTemplate: true,
                      ),
                    );
                  },
                ),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) => _buildErrorState(
              context,
              'Failed to load templates',
              error.toString(),
              () => ref.invalidate(workflowTemplatesProvider),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMyWorkflowsTab(BuildContext context, WidgetRef ref, AsyncValue<List<Workflow>> workflowsAsync) {
    return workflowsAsync.when(
      data: (workflows) {
        if (workflows.isEmpty) {
          return _buildEmptyState(
            context,
            'No workflows yet',
            'Create your first workflow to get started with structured processes.',
            Icons.folder_outlined,
            action: () => _createNewWorkflow(context),
            actionLabel: 'Create Workflow',
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(userWorkflowsProvider);
          },
          child: ListView.builder(
            padding: const EdgeInsets.all(16.0),
            itemCount: workflows.length,
            itemBuilder: (context, index) {
              final workflow = workflows[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 12.0),
                child: WorkflowCard(
                  workflow: workflow,
                  onTap: () => _startWorkflow(context, ref, workflow),
                  onView: () => _viewWorkflow(context, workflow),
                  onEdit: () => _editWorkflow(context, workflow),
                  isTemplate: false,
                ),
              );
            },
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => _buildErrorState(
        context,
        'Failed to load workflows',
        error.toString(),
        () => ref.invalidate(userWorkflowsProvider),
      ),
    );
  }

  Widget _buildEmptyState(
    BuildContext context,
    String title,
    String subtitle,
    IconData icon, {
    VoidCallback? action,
    String? actionLabel,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 80,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            if (action != null) ...[
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: action,
                icon: const Icon(Icons.add),
                label: Text(actionLabel ?? 'Get Started'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(
    BuildContext context,
    String title,
    String error,
    VoidCallback onRetry,
  ) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              size: 80,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              error,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _startWorkflow(BuildContext context, WidgetRef ref, Workflow workflow) async {
    try {
      // Start workflow execution
      await ref.read(currentWorkflowExecutionProvider.notifier).startExecution(workflow.id);
      
      // Navigate to execution page
      if (context.mounted) {
        context.push('/workflows/execution');
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to start workflow: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    }
  }

  void _viewWorkflow(BuildContext context, Workflow workflow) {
    context.push('/workflows/${workflow.id}');
  }

  void _editWorkflow(BuildContext context, Workflow workflow) {
    context.push('/workflows/${workflow.id}/edit');
  }

  void _createNewWorkflow(BuildContext context) {
    context.push('/workflows/create');
  }
}