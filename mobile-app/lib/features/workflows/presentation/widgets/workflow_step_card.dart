import 'package:flutter/material.dart';
import '../../domain/entities/workflow_execution.dart';

class WorkflowStepCard extends StatelessWidget {
  final WorkflowStepExecution stepExecution;
  final bool isActive;
  final bool isCompleted;

  const WorkflowStepCard({
    super.key,
    required this.stepExecution,
    required this.isActive,
    this.isCompleted = false,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: isActive ? 4 : 1,
      clipBehavior: Clip.antiAlias,
      color: isActive ? Theme.of(context).colorScheme.primaryContainer : null,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with step name and status
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        stepExecution.stepName,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: isActive 
                            ? Theme.of(context).colorScheme.onPrimaryContainer
                            : null,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(
                            'Step ${stepExecution.stepOrder}',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: isActive 
                                ? Theme.of(context).colorScheme.onPrimaryContainer.withOpacity(0.7)
                                : Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(width: 8),
                          _buildStatusChip(context),
                        ],
                      ),
                    ],
                  ),
                ),
                if (isActive) _buildActiveIndicator(context),
                if (isCompleted) _buildCompletedIndicator(context),
              ],
            ),

            // AI Response (if available)
            if (stepExecution.aiResponse != null && stepExecution.aiResponse!.isNotEmpty) ...[
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12.0),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.smart_toy,
                          size: 16,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'AI Assistant',
                          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: Theme.of(context).colorScheme.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      stepExecution.aiResponse!,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
            ],

            // User Input (if available)
            if (stepExecution.userInput != null && stepExecution.userInput!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12.0),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.person,
                          size: 16,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Your Response',
                          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      stepExecution.userInput!,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
            ],

            // Error Message (if any)
            if (stepExecution.errorMessage != null && stepExecution.errorMessage!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12.0),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.errorContainer,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: Theme.of(context).colorScheme.error.withOpacity(0.3),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.error_outline,
                          size: 16,
                          color: Theme.of(context).colorScheme.error,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Error',
                          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: Theme.of(context).colorScheme.error,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      stepExecution.errorMessage!,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onErrorContainer,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Timing information (if available)
            if (stepExecution.executionTime != null || stepExecution.startedAt != null) ...[
              const SizedBox(height: 12),
              _buildTimingInfo(context),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(BuildContext context) {
    final statusInfo = _getStatusInfo(stepExecution.status);
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: statusInfo.$2.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: statusInfo.$2.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            statusInfo.$1,
            size: 10,
            color: statusInfo.$2,
          ),
          const SizedBox(width: 4),
          Text(
            stepExecution.statusDisplayName,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: statusInfo.$2,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveIndicator(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary,
        shape: BoxShape.circle,
      ),
      child: Icon(
        Icons.play_arrow,
        size: 16,
        color: Theme.of(context).colorScheme.onPrimary,
      ),
    );
  }

  Widget _buildCompletedIndicator(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.green,
        shape: BoxShape.circle,
      ),
      child: const Icon(
        Icons.check,
        size: 16,
        color: Colors.white,
      ),
    );
  }

  Widget _buildTimingInfo(BuildContext context) {
    return Row(
      children: [
        Icon(
          Icons.schedule,
          size: 14,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: 4),
        Text(
          _getTimingText(),
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  String _getTimingText() {
    if (stepExecution.executionTime != null && stepExecution.status == StepStatus.completed) {
      final duration = stepExecution.executionTime!;
      final minutes = duration.inMinutes;
      final seconds = duration.inSeconds.remainder(60);
      
      if (minutes > 0) {
        return 'Completed in ${minutes}m ${seconds}s';
      } else {
        return 'Completed in ${seconds}s';
      }
    } else if (stepExecution.startedAt != null && stepExecution.status == StepStatus.inProgress) {
      final elapsed = DateTime.now().difference(stepExecution.startedAt!);
      final minutes = elapsed.inMinutes;
      final seconds = elapsed.inSeconds.remainder(60);
      
      if (minutes > 0) {
        return 'Running for ${minutes}m ${seconds}s';
      } else {
        return 'Running for ${seconds}s';
      }
    } else if (stepExecution.startedAt != null) {
      return 'Started at ${_formatTime(stepExecution.startedAt!)}';
    }
    
    return '';
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final stepDate = DateTime(dateTime.year, dateTime.month, dateTime.day);
    
    if (stepDate == today) {
      // Today - show time
      final hour = dateTime.hour;
      final minute = dateTime.minute.toString().padLeft(2, '0');
      final period = hour >= 12 ? 'PM' : 'AM';
      final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
      return '$displayHour:$minute $period';
    } else {
      // Different day - show date
      return '${dateTime.month}/${dateTime.day}/${dateTime.year}';
    }
  }

  (IconData, Color) _getStatusInfo(StepStatus status) {
    switch (status) {
      case StepStatus.pending:
        return (Icons.radio_button_unchecked, Colors.grey);
      case StepStatus.inProgress:
        return (Icons.play_arrow, Colors.blue);
      case StepStatus.completed:
        return (Icons.check_circle, Colors.green);
      case StepStatus.skipped:
        return (Icons.skip_next, Colors.orange);
    }
  }
}