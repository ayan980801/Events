import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../domain/entities/workflow_execution.dart';
import '../providers/workflow_providers.dart';
import '../widgets/step_progress_indicator.dart';
import '../widgets/workflow_step_card.dart';
import '../widgets/step_input_form.dart';

class WorkflowExecutionPage extends ConsumerWidget {
  const WorkflowExecutionPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final executionAsync = ref.watch(currentWorkflowExecutionProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Workflow Execution'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => _handleExit(context, ref),
        ),
        actions: [
          executionAsync.when(
            data: (execution) {
              if (execution == null) return const SizedBox.shrink();
              
              final exec = execution as WorkflowExecution; // Explicit cast
              
              return PopupMenuButton<String>(
                onSelected: (value) => _handleAction(context, ref, value),
                itemBuilder: (context) => [
                  if (exec.status == WorkflowExecutionStatus.inProgress) ...[
                    const PopupMenuItem(
                      value: 'pause',
                      child: Row(
                        children: [
                          Icon(Icons.pause),
                          SizedBox(width: 8),
                          Text('Pause'),
                        ],
                      ),
                    ),
                  ],
                  if (exec.status == WorkflowExecutionStatus.paused) ...[
                    const PopupMenuItem(
                      value: 'resume',
                      child: Row(
                        children: [
                          Icon(Icons.play_arrow),
                          SizedBox(width: 8),
                          Text('Resume'),
                        ],
                      ),
                    ),
                  ],
                  if ([WorkflowExecutionStatus.inProgress, WorkflowExecutionStatus.paused]
                      .contains(exec.status)) ...[
                    const PopupMenuItem(
                      value: 'cancel',
                      child: Row(
                        children: [
                          Icon(Icons.cancel, color: Colors.red),
                          SizedBox(width: 8),
                          Text('Cancel', style: TextStyle(color: Colors.red)),
                        ],
                      ),
                    ),
                  ],
                ],
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
        ],
      ),
      body: executionAsync.when(
        data: (execution) {
          if (execution == null) {
            return _buildNoExecutionState(context);
          }
          return _buildExecutionContent(context, ref, execution as WorkflowExecution);
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => _buildErrorState(context, error.toString()),
      ),
    );
  }

  Widget _buildNoExecutionState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.workspaces_outline,
              size: 80,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text(
              'No Workflow Running',
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Start a workflow from the templates or your saved workflows.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () => context.go('/workflows'),
              icon: const Icon(Icons.arrow_back),
              label: const Text('Browse Workflows'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExecutionContent(BuildContext context, WidgetRef ref, WorkflowExecution execution) {
    return Column(
      children: [
        // Progress indicator
        Container(
          padding: const EdgeInsets.all(16.0),
          color: Theme.of(context).colorScheme.surface,
          child: StepProgressIndicator(execution: execution),
        ),
        
        // Main content
        Expanded(
          child: _buildMainContent(context, ref, execution),
        ),
      ],
    );
  }

  Widget _buildMainContent(BuildContext context, WidgetRef ref, WorkflowExecution execution) {
    if (execution.status == WorkflowExecutionStatus.completed) {
      return _buildCompletedState(context, execution);
    }
    
    if (execution.status == WorkflowExecutionStatus.failed) {
      return _buildFailedState(context, execution);
    }
    
    if (execution.status == WorkflowExecutionStatus.cancelled) {
      return _buildCancelledState(context, execution);
    }

    if (execution.status == WorkflowExecutionStatus.paused) {
      return _buildPausedState(context, ref, execution);
    }

    // In progress or created
    final currentStep = execution.currentStepExecution;
    if (currentStep == null) {
      return _buildErrorState(context, 'No current step found');
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          // Current step card
          WorkflowStepCard(
            stepExecution: currentStep,
            isActive: true,
          ),
          
          const SizedBox(height: 24),
          
          // Input form for current step
          StepInputForm(
            stepExecution: currentStep,
            onSubmit: (input, data) => _executeStep(context, ref, input, data),
          ),
          
          const SizedBox(height: 32),
          
          // Completed steps (optional, for reference)
          if (execution.completedStepsCount > 0) ...[
            Text(
              'Completed Steps',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            ...execution.stepExecutions
                .where((step) => step.status == StepStatus.completed)
                .map((step) => Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: WorkflowStepCard(
                        stepExecution: step,
                        isActive: false,
                        isCompleted: true,
                      ),
                    )),
          ],
        ],
      ),
    );
  }

  Widget _buildCompletedState(BuildContext context, WorkflowExecution execution) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.check_circle,
              size: 80,
              color: Colors.green,
            ),
            const SizedBox(height: 16),
            Text(
              'Workflow Completed!',
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'You have successfully completed all steps in this workflow.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            if (execution.elapsedTime != null) ...[
              const SizedBox(height: 16),
              Text(
                'Completed in ${_formatDuration(execution.elapsedTime!)}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton(
                  onPressed: () => context.go('/workflows'),
                  child: const Text('Browse Workflows'),
                ),
                const SizedBox(width: 16),
                FilledButton(
                  onPressed: () => _viewResults(context, execution),
                  child: const Text('View Results'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFailedState(BuildContext context, WorkflowExecution execution) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error,
              size: 80,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Workflow Failed',
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            if (execution.errorMessage != null) ...[
              Text(
                execution.errorMessage!,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => context.go('/workflows'),
              child: const Text('Back to Workflows'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCancelledState(BuildContext context, WorkflowExecution execution) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.cancel_outlined,
              size: 80,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text(
              'Workflow Cancelled',
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'This workflow execution was cancelled.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => context.go('/workflows'),
              child: const Text('Back to Workflows'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPausedState(BuildContext context, WidgetRef ref, WorkflowExecution execution) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.pause_circle_outline,
              size: 80,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 16),
            Text(
              'Workflow Paused',
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Resume when you\'re ready to continue.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton(
                  onPressed: () => context.go('/workflows'),
                  child: const Text('Back to Workflows'),
                ),
                const SizedBox(width: 16),
                FilledButton.icon(
                  onPressed: () => _handleAction(context, ref, 'resume'),
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Resume'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, String error) {
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
              'Error',
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
            FilledButton(
              onPressed: () => context.go('/workflows'),
              child: const Text('Back to Workflows'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _executeStep(BuildContext context, WidgetRef ref, String input, Map<String, dynamic>? data) async {
    try {
      await ref.read(currentWorkflowExecutionProvider.notifier).executeStep(input, data: data);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to execute step: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    }
  }

  Future<void> _handleAction(BuildContext context, WidgetRef ref, String action) async {
    try {
      final notifier = ref.read(currentWorkflowExecutionProvider.notifier);
      
      switch (action) {
        case 'pause':
          await notifier.pauseExecution();
          break;
        case 'resume':
          await notifier.resumeExecution();
          break;
        case 'cancel':
          final confirmed = await _showCancelConfirmation(context);
          if (confirmed) {
            await notifier.cancelExecution();
          }
          break;
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Action failed: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    }
  }

  Future<bool> _showCancelConfirmation(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Workflow'),
        content: const Text('Are you sure you want to cancel this workflow? Your progress will be lost.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Keep Going'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Cancel Workflow'),
          ),
        ],
      ),
    );
    
    return result ?? false;
  }

  Future<void> _handleExit(BuildContext context, WidgetRef ref) async {
    final execution = ref.read(currentWorkflowExecutionProvider).value;
    
    if (execution?.status == WorkflowExecutionStatus.inProgress) {
      final shouldExit = await _showExitConfirmation(context);
      if (!shouldExit) return;
    }
    
    ref.read(currentWorkflowExecutionProvider.notifier).clearExecution();
    if (context.mounted) {
      context.go('/workflows');
    }
  }

  Future<bool> _showExitConfirmation(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Exit Workflow'),
        content: const Text('The workflow is still in progress. Are you sure you want to exit? You can resume it later.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Stay'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Exit'),
          ),
        ],
      ),
    );
    
    return result ?? false;
  }

  void _viewResults(BuildContext context, WorkflowExecution execution) {
    // TODO: Implement results view
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Results view coming soon!')),
    );
  }

  String _formatDuration(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    
    if (hours > 0) {
      return '${hours}h ${minutes}m';
    } else {
      return '${minutes}m';
    }
  }
}