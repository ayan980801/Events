import 'package:flutter/material.dart';
import '../../domain/entities/workflow_execution.dart';

class StepProgressIndicator extends StatelessWidget {
  final WorkflowExecution execution;

  const StepProgressIndicator({
    super.key,
    required this.execution,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header with status and progress
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    execution.statusDisplayName,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: _getStatusColor(context, execution.status),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Step ${execution.completedStepsCount + (execution.status == WorkflowExecutionStatus.inProgress ? 1 : 0)} of ${execution.totalStepsCount}',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            // Progress percentage
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '${(execution.progressPercentage * 100).round()}%',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        
        const SizedBox(height: 16),
        
        // Progress bar
        LinearProgressIndicator(
          value: execution.progressPercentage,
          backgroundColor: Theme.of(context).colorScheme.outline.withOpacity(0.2),
          valueColor: AlwaysStoppedAnimation<Color>(
            _getStatusColor(context, execution.status),
          ),
          minHeight: 6,
        ),
        
        const SizedBox(height: 16),
        
        // Step indicators
        if (execution.stepExecutions.isNotEmpty)
          _buildStepIndicators(context),
      ],
    );
  }

  Widget _buildStepIndicators(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: execution.stepExecutions
            .asMap()
            .entries
            .map((entry) {
              final index = entry.key;
              final stepExecution = entry.value;
              final isLast = index == execution.stepExecutions.length - 1;
              
              return Row(
                children: [
                  _buildStepIndicator(context, stepExecution),
                  if (!isLast) _buildConnector(context, stepExecution),
                ],
              );
            })
            .toList(),
      ),
    );
  }

  Widget _buildStepIndicator(BuildContext context, WorkflowStepExecution stepExecution) {
    final isActive = execution.currentStepId == stepExecution.stepId;
    final color = _getStepColor(context, stepExecution.status, isActive);
    final icon = _getStepIcon(stepExecution.status, isActive);
    
    return Column(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(
              color: isActive 
                ? Theme.of(context).colorScheme.primary 
                : Colors.transparent,
              width: 2,
            ),
          ),
          child: Icon(
            icon,
            size: 20,
            color: _getIconColor(context, stepExecution.status, isActive),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: 80,
          child: Text(
            stepExecution.stepName,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: isActive 
                ? Theme.of(context).colorScheme.primary
                : Theme.of(context).colorScheme.onSurfaceVariant,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
            ),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildConnector(BuildContext context, WorkflowStepExecution stepExecution) {
    final isCompleted = stepExecution.status == StepStatus.completed ||
                      stepExecution.status == StepStatus.skipped;
    
    return Container(
      width: 24,
      height: 2,
      margin: const EdgeInsets.only(bottom: 32), // Account for step name height
      color: isCompleted
        ? Theme.of(context).colorScheme.primary
        : Theme.of(context).colorScheme.outline.withOpacity(0.3),
    );
  }

  Color _getStatusColor(BuildContext context, WorkflowExecutionStatus status) {
    switch (status) {
      case WorkflowExecutionStatus.created:
        return Theme.of(context).colorScheme.outline;
      case WorkflowExecutionStatus.inProgress:
        return Theme.of(context).colorScheme.primary;
      case WorkflowExecutionStatus.paused:
        return Colors.orange;
      case WorkflowExecutionStatus.completed:
        return Colors.green;
      case WorkflowExecutionStatus.failed:
        return Theme.of(context).colorScheme.error;
      case WorkflowExecutionStatus.cancelled:
        return Theme.of(context).colorScheme.outline;
    }
  }

  Color _getStepColor(BuildContext context, StepStatus status, bool isActive) {
    if (isActive) {
      return Theme.of(context).colorScheme.primaryContainer;
    }
    
    switch (status) {
      case StepStatus.pending:
        return Theme.of(context).colorScheme.surface;
      case StepStatus.inProgress:
        return Theme.of(context).colorScheme.primaryContainer;
      case StepStatus.completed:
        return Colors.green.withOpacity(0.2);
      case StepStatus.skipped:
        return Theme.of(context).colorScheme.outline.withOpacity(0.2);
    }
  }

  Color _getIconColor(BuildContext context, StepStatus status, bool isActive) {
    if (isActive) {
      return Theme.of(context).colorScheme.onPrimaryContainer;
    }
    
    switch (status) {
      case StepStatus.pending:
        return Theme.of(context).colorScheme.outline;
      case StepStatus.inProgress:
        return Theme.of(context).colorScheme.onPrimaryContainer;
      case StepStatus.completed:
        return Colors.green;
      case StepStatus.skipped:
        return Theme.of(context).colorScheme.outline;
    }
  }

  IconData _getStepIcon(StepStatus status, bool isActive) {
    if (isActive && status == StepStatus.inProgress) {
      return Icons.play_arrow;
    }
    
    switch (status) {
      case StepStatus.pending:
        return Icons.radio_button_unchecked;
      case StepStatus.inProgress:
        return Icons.play_arrow;
      case StepStatus.completed:
        return Icons.check;
      case StepStatus.skipped:
        return Icons.skip_next;
    }
  }
}