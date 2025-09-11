import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/workflow.dart';
import '../providers/workflow_providers.dart';

class WorkflowCategoryFilter extends ConsumerWidget {
  const WorkflowCategoryFilter({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedCategory = ref.watch(selectedWorkflowCategoryProvider);

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          // All categories filter
          _buildFilterChip(
            context,
            ref,
            'All',
            Icons.apps,
            null,
            selectedCategory == null,
          ),
          const SizedBox(width: 8),
          
          // Individual category filters
          ...WorkflowCategory.values.map(
            (category) => Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: _buildFilterChip(
                context,
                ref,
                _getCategoryDisplayName(category),
                _getCategoryIcon(category),
                category,
                selectedCategory == category,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(
    BuildContext context,
    WidgetRef ref,
    String label,
    IconData icon,
    WorkflowCategory? category,
    bool isSelected,
  ) {
    return FilterChip(
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 16,
            color: isSelected 
              ? Theme.of(context).colorScheme.onPrimary
              : Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 6),
          Text(label),
        ],
      ),
      selected: isSelected,
      onSelected: (selected) {
        ref.read(selectedWorkflowCategoryProvider.notifier).state = 
            selected ? category : null;
      },
      backgroundColor: Theme.of(context).colorScheme.surface,
      selectedColor: Theme.of(context).colorScheme.primary,
      checkmarkColor: Theme.of(context).colorScheme.onPrimary,
      labelStyle: TextStyle(
        color: isSelected 
          ? Theme.of(context).colorScheme.onPrimary
          : Theme.of(context).colorScheme.onSurfaceVariant,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
      ),
      side: BorderSide(
        color: isSelected 
          ? Theme.of(context).colorScheme.primary
          : Theme.of(context).colorScheme.outline.withOpacity(0.5),
      ),
    );
  }

  String _getCategoryDisplayName(WorkflowCategory category) {
    switch (category) {
      case WorkflowCategory.taskManagement:
        return 'Tasks';
      case WorkflowCategory.decisionMaking:
        return 'Decisions';
      case WorkflowCategory.planning:
        return 'Planning';
      case WorkflowCategory.problemSolving:
        return 'Problems';
      case WorkflowCategory.learning:
        return 'Learning';
      case WorkflowCategory.brainstorming:
        return 'Ideas';
      case WorkflowCategory.custom:
        return 'Custom';
    }
  }

  IconData _getCategoryIcon(WorkflowCategory category) {
    switch (category) {
      case WorkflowCategory.taskManagement:
        return Icons.assignment;
      case WorkflowCategory.decisionMaking:
        return Icons.psychology;
      case WorkflowCategory.planning:
        return Icons.calendar_month;
      case WorkflowCategory.problemSolving:
        return Icons.lightbulb;
      case WorkflowCategory.learning:
        return Icons.school;
      case WorkflowCategory.brainstorming:
        return Icons.wb_incandescent;
      case WorkflowCategory.custom:
        return Icons.tune;
    }
  }
}